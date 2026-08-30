const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Specification = require('../schema/specificationModel');
const Category = require('../schema/categorymodel');
const SubCategory = require('../schema/subcategorymodel');
const LocationState = require('../schema/locationState');
const LocationCity = require('../schema/locationCity');
const LocationCountry = require('../schema/locationCountry');
const User = require('../schema/user');

const VEHICLES_FILE = path.join(__dirname, 'vehicles.json');

async function runDryRun() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_ATLAS);
    console.log('Connected.');

    const data = JSON.parse(fs.readFileSync(VEHICLES_FILE, 'utf8'));
    console.log(`Loaded ${data.length} records from vehicles.json`);

    // Load reference data
    console.log('Loading Specifications...');
    const specs = await Specification.find({}, { specification_name: 1 }).lean();
    console.log('Loading Categories...');
    const categories = await Category.find({}, { category_name: 1 }).lean();
    console.log('Loading SubCategories...');
    const subCategories = await SubCategory.find({}, { sub_category_name: 1 }).lean();
    console.log('Loading States...');
    const states = await LocationState.find({}, { name: 1 }).lean();
    console.log('Loading Cities...');
    const cities = await LocationCity.find({}, { name: 1 }).lean();
    console.log('Loading Country (India)...');
    const india = await LocationCountry.findOne({ name: /india/i }, { _id: 1 }).lean();

    const normalize = (str) => String(str).toLowerCase().replace(/[^a-z0-9]/g, '');

    console.log('Building Maps...');
    const specMap = new Map(specs.map(s => [s.specification_name ? s.specification_name.toLowerCase() : '', s._id]));
    
    const catMap = new Map();
    const catMapNormalized = new Map();
    categories.forEach(c => {
        if (c.category_name) {
            catMap.set(c.category_name.toLowerCase(), c._id);
            catMapNormalized.set(normalize(c.category_name), c._id);
        }
    });

    const subCatMap = new Map();
    const subCatMapNormalized = new Map();
    subCategories.forEach(c => {
        if (c.sub_category_name) {
            subCatMap.set(c.sub_category_name.toLowerCase(), c._id);
            subCatMapNormalized.set(normalize(c.sub_category_name), c._id);
        }
    });

    const stateMap = new Map(states.map(s => [s.name ? s.name.toLowerCase() : '', s._id]));
    const cityMap = new Map(cities.map(c => [c.name ? c.name.toLowerCase() : '', c._id]));
    console.log('Maps Built.');

    const unmapped = {
        specs: new Set(),
        categories: new Set(),
        subCategories: new Set(),
        states: new Set(),
        cities: new Set(),
        ambiguousStatuses: new Set(),
    };

    const mappedRecords = [];

    for (let record of data) {
        let mapped = {
            _id: record._id,
            id: record.id,
            specifications: [],
            userid: null,
            category_id: null,
            subcategory_id: null,
            state_id: null,
            city_id: null,
            country_id: india ? india._id : null,
            address: record.location?.address || '',
            pincode: record.location?.pinCode || '',
            description: record.additionalInfo || '',
            price: record.price || 0,
            images: record.vehicleImages || [],
            user_type: 'sell',
            status: 'pending',
            viewCount: record.viewCount || 0,
            created_by: record.created_by || null,
            updated_by: record.updated_by || null,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt
        };

        // SPECIFICATIONS
        const insuranceMap = {
            "6a524f242e66c2219f4761e3": "NOT AVAILABLE",
            "69cfde6b0f8e9c4207849862": "EXPIRED",
            "69cfde3e0f8e9c420784985c": "FULL INSURANCE",
            "692003e0fe744a3b3df1c610": "THIRD PARTY"
        };
        
        let rawInsurance = record.insuranceType || record.insuranceAvailable;
        if (rawInsurance && insuranceMap[String(rawInsurance)]) {
            rawInsurance = insuranceMap[String(rawInsurance)];
        }

        const specFields = {
            'make year': record.vehicleDetails?.makeYear,
            'fuel type': record.vehicleDetails?.fuelType,
            'km driven': record.vehicleDetails?.kmDriven,
            'hours': record.vehicleDetails?.hours,
            'no. of owners': record.vehicleDetails?.numberOfOwners,
            'insurance': rawInsurance
        };

        for (const [key, val] of Object.entries(specFields)) {
            if (val !== undefined && val !== null && val !== '') {
                const specId = specMap.get(key.toLowerCase());
                if (specId) {
                    mapped.specifications.push({
                        specification_id: specId,
                        specification_value: String(val)
                    });
                } else {
                    unmapped.specs.add(key);
                }
            }
        }

        // CATEGORY / SUBCATEGORY
        if (record.category) {
            const catStr = String(record.category).toLowerCase();
            const norm = normalize(catStr);
            const catId = catMap.get(catStr) || catMapNormalized.get(norm);
            
            // Advanced fallback logic for missing categories
            if (catId) {
                mapped.category_id = catId;
            } else {
                // Find nearest match that contains "truck" if applicable
                const fallbackMatch = [...catMapNormalized.keys()].find(k => norm.includes(k) || k.includes(norm));
                if (fallbackMatch) {
                    mapped.category_id = catMapNormalized.get(fallbackMatch);
                } else if (categories.length > 0) {
                    // Ultimate fallback to prevent schema crash: assign first category
                    mapped.category_id = categories[0]._id;
                    unmapped.categories.add(catStr);
                }
            }
        }
        if (record.subCategory) {
            const subCatStr = String(record.subCategory).toLowerCase();
            const norm = normalize(subCatStr);
            const subCatId = subCatMap.get(subCatStr) || subCatMapNormalized.get(norm);
            
            if (subCatId) {
                mapped.subcategory_id = subCatId;
            } else {
                const fallbackMatch = [...subCatMapNormalized.keys()].find(k => norm.includes(k) || k.includes(norm));
                if (fallbackMatch) {
                    mapped.subcategory_id = subCatMapNormalized.get(fallbackMatch);
                } else if (subCategories.length > 0) {
                    mapped.subcategory_id = subCategories[0]._id;
                    unmapped.subCategories.add(subCatStr);
                }
            }
        }

        // LOCATION
        if (record.location?.state) {
            const stateStr = String(record.location.state).toLowerCase();
            const stateId = stateMap.get(stateStr);
            if (stateId) mapped.state_id = stateId;
            else unmapped.states.add(stateStr);
        }
        if (record.location?.city) {
            const cityStr = String(record.location.city).toLowerCase();
            const cityId = cityMap.get(cityStr);
            if (cityId) mapped.city_id = cityId;
            else unmapped.cities.add(cityStr);
        }

        // USER - just doing lookups logic for dry run
        let userKey = null;
        if (record.sellerId) {
             userKey = record.sellerId.phonenumber || record.sellerId.email || record.sellerId.name || record.sellerId._id;
             mapped.userid = `[UserLookup: ${userKey}]`; // Placeholder for dry run
        }

        // STATUS
        const validStatuses = ['draft', 'pending', 'rejected', 'accepeted', 'booking', 'purchased', 'sold'];
        if (record.approvalStatus) {
            let s = String(record.approvalStatus).toLowerCase();
            if (s === 'approved') s = 'accepeted';
            
            if (validStatuses.includes(s)) {
                mapped.status = s;
            } else {
                unmapped.ambiguousStatuses.add(String(record.approvalStatus));
                mapped.status = 'pending';
            }
        }

        mappedRecords.push({ mapped, original: record });
    }

    console.log('\n--- DRY RUN SUMMARY ---');
    console.log(`Total mapped records: ${mappedRecords.length}`);
    if (mappedRecords.length > 0) {
        console.log('\nSample Mapped Record:');
        console.log(JSON.stringify(mappedRecords[0].mapped, null, 2));
    }

    console.log('\n--- UNMAPPED FIELDS ---');
    console.log('Specifications:', Array.from(unmapped.specs));
    console.log('Categories:', Array.from(unmapped.categories));
    console.log('SubCategories:', Array.from(unmapped.subCategories));
    console.log('States:', Array.from(unmapped.states));
    console.log('Cities:', Array.from(unmapped.cities));
    console.log('Ambiguous Statuses:', Array.from(unmapped.ambiguousStatuses));

    if (!process.argv.includes('--execute')) {
        console.log('\nDry run complete. Run with --execute to perform actual insertions.');
        mongoose.disconnect();
        return;
    }

    console.log('\n--- EXECUTING MIGRATION ---');
    const BuySellProduct = require('../schema/buysellProduct');
    let insertedCount = 0;
    
    for (const { mapped, original } of mappedRecords) {
        // Find or create user
        let userDoc = null;
        if (original.sellerId) {
            const phone = original.sellerId.phonenumber;
            const email = original.sellerId.email;
            const name = original.sellerId.name || 'Migrated User';
            
            if (phone) userDoc = await User.findOne({ mobile: phone });
            if (!userDoc && email) userDoc = await User.findOne({ email: email });
            
            if (!userDoc) {
                userDoc = new User({
                    name,
                    email: email || undefined,
                    mobile: phone || undefined,
                    roleId: null, // Depending on system logic
                    status: 'active'
                });
                await userDoc.save();
            }
            mapped.userid = userDoc._id;
        }

        if (!mapped.userid) {
            console.log(`Skipping record without user: ${original._id || 'unknown'}`);
            continue;
        }

        try {
            await BuySellProduct.findByIdAndUpdate(
                mapped._id, 
                { $set: mapped }, 
                { upsert: true, new: true, timestamps: false, setDefaultsOnInsert: true }
            );
            insertedCount++;
        } catch (error) {
            console.error(`Failed to process record ${original._id}:`, error.message);
        }
    }

    console.log(`\nMigration completed. Inserted ${insertedCount} records.`);
    mongoose.disconnect();
}

runDryRun().catch(console.error);
