'use strict';

const Category = require('../../schema/categorymodel');
const SubCategory = require('../../schema/subcategorymodel');
const Specification = require('../../schema/specificationModel');
const SpecificationValue = require('../../schema/specificationValueModel');

const BRAND_RE = /brand|make/i;
const MODEL_RE = /^model$/i;

function isBrandSpec(spec) {
  return BRAND_RE.test(String(spec.specification_name || ''));
}

function isModelSpec(spec) {
  return MODEL_RE.test(String(spec.specification_name || '').trim());
}

function emptyDraft() {
  return {
    category_id: '',
    category_name: '',
    subcategory_id: '',
    subcategory_name: '',
    price: '',
    description: '',
    address: '',
    pincode: '',
    country_id: '',
    state_id: '',
    city_id: '',
    images: [],
    specifications: [],
  };
}

function initSellContext(partial = {}) {
  return {
    flow: 'sell',
    step: 'category',
    draft: emptyDraft(),
    specQueue: [],
    specIndex: 0,
    ...partial,
  };
}

function reply(content, extras = {}) {
  return {
    content,
    quickReplies: extras.quickReplies || [],
    actions: extras.actions || [],
    data: extras.data || null,
    intent: extras.intent || 'sell_flow',
    contextPatch: extras.contextPatch || null,
  };
}

async function loadActiveCategories() {
  return Category.find({ status: { $regex: /^active$/i } })
    .select('_id id uuid category_name')
    .lean()
    .limit(50);
}

async function loadSubCategories(category) {
  const keys = [String(category._id), category.id, category.uuid].filter(Boolean);
  return SubCategory.find({
    category_id: { $in: keys.map(String) },
    status: { $regex: /^active$/i },
  })
    .select('_id id uuid sub_category_name category_id')
    .lean()
    .limit(100);
}

async function loadActiveSpecs() {
  return Specification.find({ status: 'Active' })
    .select('_id id specification_name type is_required')
    .lean();
}

async function loadSpecValues(specificationId, subcategoryId) {
  const filter = {
    specification_id: specificationId,
    status: 'Active',
  };
  if (subcategoryId) {
    filter.subcategory_id = String(subcategoryId);
  }
  return SpecificationValue.find(filter)
    .select('_id id specification_value_name subcategory_id')
    .lean()
    .limit(200);
}

function buildSpecQueue(specs) {
  const brand = specs.find(isBrandSpec);
  const model = specs.find(isModelSpec);
  const rest = specs.filter(
    (s) =>
      s._id !== brand?._id &&
      s._id !== model?._id &&
      String(s.is_required).toLowerCase() === 'yes',
  );
  // Prefer brand → model → other required specs (cap for conversational UX)
  const ordered = [brand, model, ...rest].filter(Boolean);
  const seen = new Set();
  return ordered.filter((s) => {
    const id = String(s._id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  }).slice(0, 12);
}

function findByLabel(items, label, nameKey) {
  const q = String(label || '').trim().toLowerCase();
  if (!q) return null;
  return (
    items.find((i) => String(i[nameKey] || '').trim().toLowerCase() === q) ||
    items.find((i) => String(i[nameKey] || '').toLowerCase().includes(q)) ||
    null
  );
}

function upsertSpec(draft, specificationId, value) {
  const specs = Array.isArray(draft.specifications) ? [...draft.specifications] : [];
  const idx = specs.findIndex((s) => String(s.specification_id) === String(specificationId));
  const row = {
    specification_id: String(specificationId),
    specification_value: String(value),
  };
  if (idx >= 0) specs[idx] = row;
  else specs.push(row);
  draft.specifications = specs;
}

function formatConfirm(draft) {
  const lines = [
    `**Category:** ${draft.category_name || '—'}`,
    `**Type:** ${draft.subcategory_name || '—'}`,
    `**Price:** ₹${draft.price || '—'}`,
    `**Location:** ${draft.address || '—'}${draft.pincode ? ` (${draft.pincode})` : ''}`,
    `**Description:** ${draft.description || '—'}`,
  ];
  if (draft.specifications?.length) {
    lines.push('', '**Specifications collected:** ' + draft.specifications.length);
  }
  return lines.join('\n');
}

async function askNextSpec(ctx) {
  const queue = ctx.specQueue || [];
  const index = ctx.specIndex || 0;
  if (index >= queue.length) {
    ctx.step = 'price';
    return reply(
      'Almost done. What is your **expected price** (in ₹)?\n\nExample: `850000` or `8.5 lakhs`',
      {
        contextPatch: ctx,
        quickReplies: [
          { label: '₹5 Lakh', value: '500000' },
          { label: '₹10 Lakh', value: '1000000' },
          { label: '₹25 Lakh', value: '2500000' },
        ],
      },
    );
  }

  const spec = queue[index];
  ctx.step = 'spec';
  ctx.currentSpecId = String(spec._id);
  ctx.currentSpecName = spec.specification_name;

  let quickReplies = [];
  if (spec.type === 'selectable' || isBrandSpec(spec)) {
    const values = await loadSpecValues(spec._id, ctx.draft.subcategory_id);
    quickReplies = values.slice(0, 20).map((v) => ({
      label: v.specification_value_name,
      value: v.specification_value_name,
    }));
  }

  const required = String(spec.is_required).toLowerCase() === 'yes' ? ' (required)' : '';
  return reply(`**${spec.specification_name}**${required}?\n\nSelect an option or type your answer.`, {
    contextPatch: ctx,
    quickReplies,
    data: { specId: String(spec._id), specName: spec.specification_name },
  });
}

/**
 * Start or continue the conversational sell listing flow.
 */
async function handleSellFlow(sessionContext, userMessage) {
  const text = String(userMessage || '').trim();
  let ctx = sessionContext?.flow === 'sell'
    ? { ...sessionContext, draft: { ...emptyDraft(), ...(sessionContext.draft || {}) } }
    : initSellContext();

  // Cancel
  if (/^(cancel|stop|exit|quit)$/i.test(text)) {
    return reply('Sell flow cancelled. How else can I help?', {
      intent: 'sell_cancelled',
      contextPatch: { flow: null },
      quickReplies: [
        { label: 'Create a listing', value: 'I want to sell my vehicle' },
        { label: 'My listings', value: 'How many vehicles do I have?' },
      ],
    });
  }

  // Kickoff / restart
  if (!sessionContext?.flow || sessionContext.flow !== 'sell' || ctx.step === 'category') {
    if (
      sessionContext?.flow !== 'sell' ||
      ctx.step === 'category' && (!ctx.draft?.category_id || /sell|list|publish|create/i.test(text))
    ) {
      const categories = await loadActiveCategories();
      if (!ctx.draft?.category_id) {
        // Try match category from message (e.g. "sell a truck" / "create a car listing")
        const hint = text
          .replace(/i want to sell( my| a| an)?/i, '')
          .replace(/create (a |an )?/i, '')
          .replace(/listing/i, '')
          .trim();
        const matched =
          findByLabel(categories, hint, 'category_name') ||
          findByLabel(categories, text, 'category_name');
        if (matched && hint.length >= 2) {
          ctx.draft.category_id = String(matched._id);
          ctx.draft.category_name = matched.category_name;
          ctx.step = 'subcategory';
          const subs = await loadSubCategories(matched);
          if (subs.length === 0) {
            // No subcategories — go to specs
            const specs = await loadActiveSpecs();
            ctx.specQueue = buildSpecQueue(specs);
            ctx.specIndex = 0;
            return askNextSpec(ctx);
          }
          if (subs.length === 1) {
            ctx.draft.subcategory_id = String(subs[0]._id);
            ctx.draft.subcategory_name = subs[0].sub_category_name;
            const specs = await loadActiveSpecs();
            ctx.specQueue = buildSpecQueue(specs);
            ctx.specIndex = 0;
            const next = await askNextSpec(ctx);
            next.content = `Great — listing under **${matched.category_name} / ${subs[0].sub_category_name}**.\n\n${next.content}`;
            return next;
          }
          return reply(`Category set to **${matched.category_name}**.\n\nWhich type / sub-category?`, {
            contextPatch: ctx,
            quickReplies: subs.slice(0, 20).map((s) => ({
              label: s.sub_category_name,
              value: s.sub_category_name,
            })),
          });
        }

        ctx = initSellContext();
        return reply(
          "Great! I'll help you create a listing.\n\n**Step 1 — Which category?**",
          {
            contextPatch: ctx,
            quickReplies: categories.slice(0, 20).map((c) => ({
              label: c.category_name,
              value: c.category_name,
            })),
          },
        );
      }
    }
  }

  if (ctx.step === 'category') {
    const categories = await loadActiveCategories();
    const matched = findByLabel(categories, text, 'category_name');
    if (!matched) {
      return reply("I couldn't match that category. Please pick one:", {
        contextPatch: ctx,
        quickReplies: categories.slice(0, 20).map((c) => ({
          label: c.category_name,
          value: c.category_name,
        })),
      });
    }
    ctx.draft.category_id = String(matched._id);
    ctx.draft.category_name = matched.category_name;
    ctx.step = 'subcategory';
    const subs = await loadSubCategories(matched);
    if (subs.length === 0) {
      const specs = await loadActiveSpecs();
      ctx.specQueue = buildSpecQueue(specs);
      ctx.specIndex = 0;
      return askNextSpec(ctx);
    }
    return reply(`**${matched.category_name}** selected.\n\n**Step 2 — Which type / sub-category?**`, {
      contextPatch: ctx,
      quickReplies: subs.slice(0, 20).map((s) => ({
        label: s.sub_category_name,
        value: s.sub_category_name,
      })),
    });
  }

  if (ctx.step === 'subcategory') {
    const category = await Category.findById(ctx.draft.category_id).lean();
    const subs = category ? await loadSubCategories(category) : [];
    const matched = findByLabel(subs, text, 'sub_category_name');
    if (!matched) {
      return reply('Please choose a sub-category:', {
        contextPatch: ctx,
        quickReplies: subs.slice(0, 20).map((s) => ({
          label: s.sub_category_name,
          value: s.sub_category_name,
        })),
      });
    }
    ctx.draft.subcategory_id = String(matched._id);
    ctx.draft.subcategory_name = matched.sub_category_name;
    const specs = await loadActiveSpecs();
    ctx.specQueue = buildSpecQueue(specs);
    ctx.specIndex = 0;
    return askNextSpec(ctx);
  }

  if (ctx.step === 'spec') {
    const specId = ctx.currentSpecId;
    const queue = ctx.specQueue || [];
    const current = queue[ctx.specIndex];
    if (!current || String(current._id) !== String(specId)) {
      return askNextSpec(ctx);
    }

    let valueToStore = text;
    if (current.type === 'selectable' || isBrandSpec(current)) {
      const values = await loadSpecValues(current._id, ctx.draft.subcategory_id);
      const matched = findByLabel(values, text, 'specification_value_name');
      if (matched) {
        // Store value ObjectId string when selectable (matches form behaviour)
        valueToStore = String(matched._id);
      } else if (String(current.is_required).toLowerCase() === 'yes' && values.length) {
        return reply(`Please pick a valid **${current.specification_name}**:`, {
          contextPatch: ctx,
          quickReplies: values.slice(0, 20).map((v) => ({
            label: v.specification_value_name,
            value: v.specification_value_name,
          })),
        });
      }
    }

    upsertSpec(ctx.draft, current._id, valueToStore);
    ctx.specIndex = (ctx.specIndex || 0) + 1;
    return askNextSpec(ctx);
  }

  if (ctx.step === 'price') {
    const cleaned = text.toLowerCase().replace(/[₹,\s]/g, '');
    let price = Number(cleaned.replace(/lakhs?|l$/, (m) => ''));
    if (/lakh|l$/i.test(text) && Number.isFinite(price)) {
      price = price * 100000;
    } else {
      price = Number(text.replace(/[₹,\s]/g, ''));
    }
    if (!Number.isFinite(price) || price <= 0) {
      return reply('Please enter a valid price greater than zero (e.g. `750000`).', {
        contextPatch: ctx,
      });
    }
    ctx.draft.price = price;
    ctx.step = 'location';
    return reply('Where is the vehicle located?\n\nType an **address** (city / area). You can also include pincode.', {
      contextPatch: ctx,
      quickReplies: [
        { label: 'Chennai', value: 'Chennai' },
        { label: 'Bangalore', value: 'Bangalore' },
        { label: 'Hyderabad', value: 'Hyderabad' },
        { label: 'Skip location', value: 'skip' },
      ],
    });
  }

  if (ctx.step === 'location') {
    if (!/^skip$/i.test(text)) {
      const pinMatch = text.match(/\b\d{6}\b/);
      ctx.draft.address = text.replace(/\b\d{6}\b/, '').trim() || text;
      if (pinMatch) ctx.draft.pincode = pinMatch[0];
    }
    ctx.step = 'description';
    return reply('Add a short **description** for your listing (or type `skip`).', {
      contextPatch: ctx,
      quickReplies: [
        { label: 'Skip description', value: 'skip' },
        { label: 'Well maintained, single owner', value: 'Well maintained, single owner' },
      ],
    });
  }

  if (ctx.step === 'description') {
    if (!/^skip$/i.test(text)) {
      ctx.draft.description = text;
    }
    ctx.step = 'confirm';
    const summary = formatConfirm(ctx.draft);
    const publishPayload = {
      category_id: ctx.draft.category_id,
      subcategory_id: ctx.draft.subcategory_id,
      price: ctx.draft.price,
      description: ctx.draft.description || `${ctx.draft.category_name} for sale`,
      images: [],
      specifications: ctx.draft.specifications || [],
      country_id: ctx.draft.country_id || '',
      state_id: ctx.draft.state_id || '',
      city_id: ctx.draft.city_id || '',
      address: ctx.draft.address || '',
      pincode: ctx.draft.pincode || '',
      status: 'active',
    };
    return reply(
      `Everything looks good.\n\n${summary}\n\nWould you like me to **publish** this listing?`,
      {
        contextPatch: ctx,
        quickReplies: [
          { label: 'Publish listing', value: '__publish__' },
          { label: 'Save as draft', value: '__draft__' },
          { label: 'Cancel', value: 'cancel' },
        ],
        actions: [
          {
            type: 'publish_listing',
            label: 'Publish',
            payload: publishPayload,
          },
          {
            type: 'save_draft',
            label: 'Save draft',
            payload: { ...publishPayload, status: 'draft' },
          },
        ],
      },
    );
  }

  if (ctx.step === 'confirm') {
    if (/__publish__|publish|yes|confirm/i.test(text)) {
      const payload = {
        category_id: ctx.draft.category_id,
        subcategory_id: ctx.draft.subcategory_id,
        price: ctx.draft.price,
        description: ctx.draft.description || `${ctx.draft.category_name} for sale`,
        images: [],
        specifications: ctx.draft.specifications || [],
        country_id: ctx.draft.country_id || '',
        state_id: ctx.draft.state_id || '',
        city_id: ctx.draft.city_id || '',
        address: ctx.draft.address || '',
        pincode: ctx.draft.pincode || '',
        status: 'active',
      };
      return reply('Publishing your listing now…', {
        intent: 'publish_listing',
        contextPatch: { flow: null },
        actions: [{ type: 'publish_listing', label: 'Publish', payload }],
      });
    }
    if (/__draft__|draft/i.test(text)) {
      const payload = {
        category_id: ctx.draft.category_id,
        subcategory_id: ctx.draft.subcategory_id,
        price: ctx.draft.price,
        description: ctx.draft.description || `${ctx.draft.category_name} for sale`,
        images: [],
        specifications: ctx.draft.specifications || [],
        country_id: ctx.draft.country_id || '',
        state_id: ctx.draft.state_id || '',
        city_id: ctx.draft.city_id || '',
        address: ctx.draft.address || '',
        pincode: ctx.draft.pincode || '',
        status: 'draft',
      };
      return reply('Saving as draft…', {
        intent: 'save_draft',
        contextPatch: { flow: null },
        actions: [{ type: 'save_draft', label: 'Save draft', payload }],
      });
    }
    return reply('Reply **Publish**, **Save as draft**, or **Cancel**.', {
      contextPatch: ctx,
      quickReplies: [
        { label: 'Publish listing', value: '__publish__' },
        { label: 'Save as draft', value: '__draft__' },
        { label: 'Cancel', value: 'cancel' },
      ],
    });
  }

  return reply("Let's continue creating your listing. What would you like to do?", {
    contextPatch: ctx,
  });
}

module.exports = {
  handleSellFlow,
  initSellContext,
  isBrandSpec,
};
