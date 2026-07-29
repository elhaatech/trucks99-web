'use strict';

/**
 * Buy & Sell knowledge module.
 * Add new intents here — do not put copy in UI components.
 *
 * Navigation names match the marketplace portal (BuySellHeader / routes).
 */

const MODULE = 'buy_sell';

/** @type {Array<{ id: string, module: string, patterns: RegExp[], keywords?: string[], priority?: number, article: object }>} */
const INTENTS = [
  {
    id: 'buy_sell.post_vehicle',
    module: MODULE,
    priority: 100,
    patterns: [
      /how (do|can|to).*(post|sell|upload|list|create).*(vehicle|truck|car|listing|product)/i,
      /how (do|can|to).*(sell|post|upload).*(my )?(truck|vehicle|car)/i,
      /(post|upload|create|list).*(vehicle|listing).*(help|guide|steps|how)/i,
      /how (do|can|to) (sell|post) (a |my |an )?(vehicle|truck|car|listing)/i,
      /steps? (to|for) (post|sell|create|upload).*(vehicle|listing)/i,
      /explain.*(post|sell|create).*(vehicle|listing)/i,
    ],
    keywords: ['post vehicle', 'sell vehicle', 'create listing', 'upload vehicle', 'how to sell'],
    article: {
      id: 'buy_sell.post_vehicle',
      module: MODULE,
      title: 'How to post a vehicle',
      intro: 'Follow these steps to create a Buy & Sell listing in TRUCKS99.',
      steps: [
        { title: 'Login', body: 'Sign in to your account (OTP login).' },
        { title: 'Open Buy & Sell', body: 'Go to the marketplace Dashboard or open **My Listings** from the header.' },
        { title: 'Post Vehicle', body: 'Click **List New Vehicle** / open the create tab on **My Listings** (or ask me: “I want to sell my truck”).' },
        { title: 'Choose Category', body: 'Select the vehicle category (e.g. Truck, Car, Trailer).' },
        { title: 'Choose Subcategory', body: 'Pick the matching subcategory / type.' },
        {
          title: 'Fill vehicle details',
          body: 'Enter the available fields for your category, such as:',
          bullets: [
            'Brand / Make',
            'Model',
            'Variant',
            'Year',
            'Fuel Type',
            'Transmission',
            'KM Driven',
            'Price',
            'Vehicle Condition',
            'Location',
            'Description',
          ],
        },
        { title: 'Upload images', body: 'Add clear vehicle photos (multiple images supported).' },
        { title: 'Additional specifications', body: 'Fill any remaining required specifications shown for that category.' },
        { title: 'Preview', body: 'Review price, location, specs, and images before submitting.' },
        { title: 'Submit', body: 'Click **Submit** / publish the listing.' },
        { title: 'Approval (if required)', body: 'If your listing goes to **Pending**, wait for admin approval.' },
        { title: 'Visible to buyers', body: 'Once **Active**, buyers can find it under **Buy Vehicle** and **Featured Vehicles** (if featured).' },
      ],
      tips: [
        'You can also create a listing conversationally with me — say “I want to sell my truck”.',
        'Use accurate price and location so buyers can find you in search/filters.',
      ],
      related: [
        { label: 'Create listing with AI', value: 'I want to sell my truck' },
        { label: 'How do I edit my listing?', value: 'How do I edit my vehicle?' },
        { label: 'How do Featured Vehicles work?', value: 'How do Featured Vehicles work?' },
        { label: 'Why isn’t my vehicle visible?', value: 'Why isn’t my vehicle visible?' },
      ],
      actions: [
        { type: 'navigate', label: 'Open My Listings', payload: { href: '/my-listings?tab=create' } },
      ],
    },
  },

  {
    id: 'buy_sell.edit_vehicle',
    module: MODULE,
    priority: 90,
    patterns: [
      /how (do|can|to).*(edit|update).*(vehicle|listing|post)/i,
      /(edit|update).*(my )?(vehicle|listing)/i,
      /change.*(details|price|photos).*(listing|vehicle)/i,
    ],
    article: {
      id: 'buy_sell.edit_vehicle',
      module: MODULE,
      title: 'How to edit a vehicle',
      steps: [
        { title: 'Open My Listings', body: 'From the header, open **My Listings** (your posted vehicles).' },
        { title: 'Select the vehicle', body: 'Find the listing you want to change.' },
        { title: 'Click Edit', body: 'Open the edit screen for that vehicle.' },
        { title: 'Update details', body: 'Change price, description, specs, images, or location as needed.' },
        { title: 'Save changes', body: 'Save / submit the update.' },
      ],
      tips: ['Sold or locked lifecycle listings may not be editable.'],
      related: [
        { label: 'How do I delete my vehicle?', value: 'How do I delete my vehicle?' },
        { label: 'Show my listings', value: 'How many vehicles do I have?' },
      ],
      actions: [
        { type: 'navigate', label: 'Open My Listings', payload: { href: '/my-listings' } },
      ],
    },
  },

  {
    id: 'buy_sell.delete_vehicle',
    module: MODULE,
    priority: 90,
    patterns: [
      /how (do|can|to).*delete.*(vehicle|listing|post)/i,
      /remove.*(my )?(vehicle|listing)/i,
      /delete.*(my )?(vehicle|listing)/i,
    ],
    article: {
      id: 'buy_sell.delete_vehicle',
      module: MODULE,
      title: 'How to delete a vehicle',
      steps: [
        { title: 'Open My Listings', body: 'Go to **My Listings**.' },
        { title: 'Select the vehicle', body: 'Choose the listing to remove.' },
        { title: 'Click Delete', body: 'Use the delete action on that listing.' },
        { title: 'Confirm', body: 'Confirm deletion when prompted. This cannot always be undone.' },
      ],
      related: [
        { label: 'How do I edit my vehicle?', value: 'How do I edit my vehicle?' },
        { label: 'Mark as sold', value: 'How do I mark my vehicle as sold?' },
      ],
      actions: [
        { type: 'navigate', label: 'Open My Listings', payload: { href: '/my-listings' } },
      ],
    },
  },

  {
    id: 'buy_sell.buy_vehicle',
    module: MODULE,
    priority: 95,
    patterns: [
      /how (do|can|to).*buy.*(vehicle|truck|car|listing)/i,
      /how (do|can|to).*purchase.*(vehicle|truck|car)/i,
      /steps? (to|for) buy/i,
      /buying (a )?(vehicle|truck|car)/i,
    ],
    article: {
      id: 'buy_sell.buy_vehicle',
      module: MODULE,
      title: 'How to buy a vehicle',
      steps: [
        { title: 'Open Buy & Sell', body: 'Go to **Buy Vehicle** from the header (or Dashboard explore).' },
        { title: 'Search vehicles', body: 'Use search or browse listings.' },
        { title: 'Apply filters', body: 'Filter by category, price, location, and specifications.' },
        { title: 'Open vehicle details', body: 'Tap a listing to see full details.' },
        { title: 'Review', body: 'Check images, specifications, price, and seller info.' },
        { title: 'Contact or offer', body: 'Use **Chat** to message the seller, or **Make Offer** to bid.' },
        { title: 'Payment (if required)', body: 'Complete booking/purchase payment when the flow asks for it.' },
        { title: 'Done', body: 'Track status under **Purchases** / offer status under **Offers**.' },
      ],
      related: [
        { label: 'How do I make an offer?', value: 'How do I make an offer?' },
        { label: 'How do I chat with the seller?', value: 'How do I chat with the seller?' },
        { label: 'How do I search vehicles?', value: 'How do I search vehicles?' },
      ],
      actions: [
        { type: 'navigate', label: 'Browse vehicles', payload: { href: '/list' } },
      ],
    },
  },

  {
    id: 'buy_sell.make_offer',
    module: MODULE,
    priority: 92,
    patterns: [
      /how (do|can|to).*(make|send|place|give).*(offer|bid)/i,
      /how (do|can|to).*offer/i,
      /(send|place|make) (an )?offer/i,
    ],
    article: {
      id: 'buy_sell.make_offer',
      module: MODULE,
      title: 'How to make an offer',
      steps: [
        { title: 'Open vehicle details', body: 'Find a vehicle under **Buy Vehicle** and open it.' },
        { title: 'Click Make Offer', body: 'Start the offer / bid action on the detail page.' },
        { title: 'Enter offer amount', body: 'Type the amount you want to offer.' },
        { title: 'Submit offer', body: 'Submit so the seller can review it.' },
        { title: 'Seller notified', body: 'The seller gets a notification about your offer.' },
        { title: 'Accept or reject', body: 'The seller can accept or reject your offer.' },
        { title: 'If accepted', body: 'Payment / booking steps may start based on the listing flow.' },
        { title: 'Status updates', body: 'Track everything under **Offers** (Pending / Accepted / Rejected).' },
      ],
      related: [
        { label: 'Where can I see my offers?', value: 'Where can I see my offers?' },
        { label: 'How do I accept an offer?', value: 'How do I accept an offer?' },
      ],
      actions: [
        { type: 'navigate', label: 'My Offers', payload: { href: '/offers' } },
      ],
    },
  },

  {
    id: 'buy_sell.my_offers',
    module: MODULE,
    priority: 88,
    patterns: [
      /where.*(see|view|check|find).*offers?/i,
      /how (do|can|to).*(see|view|check).*offers?/i,
      /my offers?/i,
      /offer (status|history)/i,
    ],
    article: {
      id: 'buy_sell.my_offers',
      module: MODULE,
      title: 'My Offers',
      steps: [
        { title: 'Open Offers', body: 'From your account menu, open **Offers** (or **My Offers**).' },
        { title: 'View sent offers', body: 'See offers you have sent to sellers.' },
        { title: 'Check status', body: 'Statuses include **Pending**, **Accepted**, and **Rejected**.' },
        { title: 'Open details', body: 'Open an offer to review amount and related vehicle.' },
      ],
      related: [
        { label: 'How do I make an offer?', value: 'How do I make an offer?' },
        { label: 'How do I accept an offer?', value: 'How do I accept an offer?' },
      ],
      actions: [
        { type: 'navigate', label: 'Open Offers', payload: { href: '/offers' } },
      ],
    },
  },

  {
    id: 'buy_sell.manage_offers_seller',
    module: MODULE,
    priority: 91,
    patterns: [
      /how (do|can|to).*(accept|reject).*(offer|bid)/i,
      /(accept|reject).*(offer|bid)/i,
      /manage.*(received )?offers?/i,
      /seller.*(offer|bid)/i,
    ],
    article: {
      id: 'buy_sell.manage_offers_seller',
      module: MODULE,
      title: 'Accept or reject offers (seller)',
      steps: [
        { title: 'Open My Listings', body: 'Go to **My Listings** to see your vehicles.' },
        { title: 'Select a vehicle', body: 'Open the listing that received offers.' },
        { title: 'View received offers', body: 'Review offer amounts and buyers.' },
        { title: 'Accept or Reject', body: 'Choose Accept or Reject for each offer.' },
        { title: 'Buyer notified', body: 'The buyer receives a notification with the decision.' },
      ],
      related: [
        { label: 'Where can I see my offers?', value: 'Where can I see my offers?' },
        { label: 'How do payments work?', value: 'How do payments work?' },
      ],
      actions: [
        { type: 'navigate', label: 'My Listings', payload: { href: '/my-listings' } },
        { type: 'navigate', label: 'Offers', payload: { href: '/offers' } },
      ],
    },
  },

  {
    id: 'buy_sell.favorites',
    module: MODULE,
    priority: 85,
    patterns: [
      /how (do|can|to).*(favorite|favourite|wishlist|heart)/i,
      /add to favorites?/i,
      /remove from favorites?/i,
      /how.*(favorites?|favourites?) work/i,
      /my favorites?/i,
    ],
    article: {
      id: 'buy_sell.favorites',
      module: MODULE,
      title: 'How Favorites work',
      steps: [
        { title: 'Open vehicle details', body: 'Browse **Buy Vehicle** and open a listing.' },
        { title: 'Tap the Heart icon', body: 'Click the favorite (heart) control on the card or detail page.' },
        { title: 'Saved', body: 'The vehicle is added to **My Favorite List**.' },
        { title: 'View favorites', body: 'Open **My Favorite List** from the header anytime.' },
        { title: 'Remove', body: 'Tap the heart again (or remove from favorites) to unsave.' },
      ],
      related: [
        { label: 'How do I search vehicles?', value: 'How do I search vehicles?' },
        { label: 'How do I buy a vehicle?', value: 'How do I buy a vehicle?' },
      ],
      actions: [
        { type: 'navigate', label: 'My Favorite List', payload: { href: '/cart' } },
      ],
    },
  },

  {
    id: 'buy_sell.featured',
    module: MODULE,
    priority: 90,
    patterns: [
      /how (do|can|to).*feature/i,
      /featured vehicles? (work|package|plan)/i,
      /how.*(featured|feature your vehicle)/i,
      /promote.*(listing|vehicle)/i,
      /boost.*(listing|vehicle)/i,
    ],
    article: {
      id: 'buy_sell.featured',
      module: MODULE,
      title: 'How Featured Vehicles work',
      steps: [
        { title: 'Open My Listings', body: 'Go to **My Listings** and choose an active vehicle.' },
        { title: 'Feature Vehicle', body: 'Start **Feature Your Vehicle** / open Featured plans.' },
        { title: 'Choose a package', body: 'Pick a featured package and duration.' },
        { title: 'Complete payment', body: 'Pay securely to activate the package.' },
        {
          title: 'After payment',
          body: 'Your listing gets:',
          bullets: [
            'A Featured badge',
            'Placement in **Featured Vehicles**',
            'Higher visibility to buyers',
          ],
        },
      ],
      related: [
        { label: 'How do payments work?', value: 'How do payments work?' },
        { label: 'Show my featured vehicles', value: 'Show my featured vehicles' },
      ],
      actions: [
        { type: 'navigate', label: 'Feature plans', payload: { href: '/featured' } },
        { type: 'navigate', label: 'Featured Vehicles', payload: { href: '/featured-vehicles' } },
      ],
    },
  },

  {
    id: 'buy_sell.payments',
    module: MODULE,
    priority: 88,
    patterns: [
      /how (do|can|to).*(pay|payment|razorpay)/i,
      /how.*payments? work/i,
      /complete payment/i,
      /check payment status/i,
      /payment (status|history)/i,
    ],
    article: {
      id: 'buy_sell.payments',
      module: MODULE,
      title: 'How payments work',
      steps: [
        { title: 'Choose package or purchase', body: 'Start featuring a vehicle, booking, or purchase when prompted.' },
        { title: 'Review details', body: 'Confirm amount, package, and vehicle before paying.' },
        { title: 'Complete payment', body: 'Finish checkout through the payment gateway.' },
        {
          title: 'On success',
          body: 'The app updates:',
          bullets: [
            'Payment status',
            'Purchase / order history (**Purchases**)',
            'Featured status (if you bought a feature package)',
          ],
        },
      ],
      related: [
        { label: 'How do Featured Vehicles work?', value: 'How do Featured Vehicles work?' },
        { label: 'How do I buy a vehicle?', value: 'How do I buy a vehicle?' },
      ],
      actions: [
        { type: 'navigate', label: 'Purchases', payload: { href: '/purchases' } },
      ],
    },
  },

  {
    id: 'buy_sell.chat_seller',
    module: MODULE,
    priority: 90,
    patterns: [
      /how (do|can|to).*(chat|message|contact).*(seller|owner)/i,
      /contact (the )?seller/i,
      /chat with (the )?seller/i,
      /message (the )?seller/i,
    ],
    article: {
      id: 'buy_sell.chat_seller',
      module: MODULE,
      title: 'How to chat with the seller',
      steps: [
        { title: 'Open vehicle details', body: 'Find a listing under **Buy Vehicle** and open it.' },
        { title: 'Chat Seller', body: 'Click **Chat** / message seller on the detail page.' },
        { title: 'Conversation starts', body: 'A chat room is created for that buyer, seller, and vehicle.' },
        { title: 'Exchange messages', body: 'Ask questions about price, inspection, documents, etc.' },
        { title: 'Notifications', body: 'New messages trigger notifications so you don’t miss replies.' },
      ],
      tips: ['You can also open **Messages** from the portal chat section when available.'],
      related: [
        { label: 'How do I make an offer?', value: 'How do I make an offer?' },
        { label: 'How do I buy a vehicle?', value: 'How do I buy a vehicle?' },
      ],
      actions: [
        { type: 'navigate', label: 'Browse vehicles', payload: { href: '/list' } },
        { type: 'navigate', label: 'Messages', payload: { href: '/chat' } },
      ],
    },
  },

  {
    id: 'buy_sell.search',
    module: MODULE,
    priority: 86,
    patterns: [
      /how (do|can|to).*search/i,
      /how (do|can|to).*filter/i,
      /search vehicles?/i,
      /what (filters|search).*(available|can|use)/i,
    ],
    article: {
      id: 'buy_sell.search',
      module: MODULE,
      title: 'Search & filters',
      intro: 'On **Buy Vehicle** / Dashboard search you can find listings using:',
      steps: [
        {
          title: 'Available filters',
          body: 'Use search and filters such as:',
          bullets: [
            'Brand',
            'Model',
            'Category',
            'Subcategory',
            'Year',
            'Price',
            'Fuel Type',
            'Transmission',
            'Vehicle Type',
            'Location',
          ],
        },
        { title: 'Open results', body: 'Browse matching cards, then open a vehicle for full details.' },
      ],
      related: [
        { label: 'How do I buy a vehicle?', value: 'How do I buy a vehicle?' },
        { label: 'Search Tata', value: 'Search Tata' },
      ],
      actions: [
        { type: 'navigate', label: 'Buy Vehicle', payload: { href: '/list' } },
      ],
    },
  },

  {
    id: 'buy_sell.my_vehicles',
    module: MODULE,
    priority: 84,
    patterns: [
      /how (do|can|to).*(check|see|view).*(posted|my).*(vehicle|listing)/i,
      /my (vehicles|listings|posts)/i,
      /where.*(my )?(vehicles|listings)/i,
      /what can i do (in|on) my (listings|vehicles)/i,
    ],
    article: {
      id: 'buy_sell.my_vehicles',
      module: MODULE,
      title: 'My Listings (My Vehicles)',
      intro: 'Open **My Listings** to manage everything you posted. From there you can:',
      steps: [
        {
          title: 'Available actions',
          body: 'On your listings you can typically:',
          bullets: [
            'View posted vehicles',
            'Edit a vehicle',
            'Delete a vehicle',
            'View offers',
            'Mark as Sold',
            'Feature a vehicle',
            'Renew / extend visibility via featured packages',
            'Open listing details',
          ],
        },
      ],
      related: [
        { label: 'How do I edit my vehicle?', value: 'How do I edit my vehicle?' },
        { label: 'How do I feature my vehicle?', value: 'How do Featured Vehicles work?' },
        { label: 'How many vehicles do I have?', value: 'How many vehicles do I have?' },
      ],
      actions: [
        { type: 'navigate', label: 'Open My Listings', payload: { href: '/my-listings' } },
      ],
    },
  },

  {
    id: 'buy_sell.mark_sold',
    module: MODULE,
    priority: 80,
    patterns: [
      /how (do|can|to).*mark.*(sold)/i,
      /mark (as )?sold/i,
      /sold.*(listing|vehicle)/i,
    ],
    article: {
      id: 'buy_sell.mark_sold',
      module: MODULE,
      title: 'Mark a vehicle as sold',
      steps: [
        { title: 'Open My Listings', body: 'Go to **My Listings**.' },
        { title: 'Select the vehicle', body: 'Choose the listing that was sold.' },
        { title: 'Mark as Sold', body: 'Use the **Mark as Sold** action.' },
        { title: 'Status updates', body: 'The listing moves to **Sold** and is no longer offered as active inventory.' },
      ],
      related: [
        { label: 'Show sold vehicles', value: 'Show my sold vehicles' },
        { label: 'How do I delete my vehicle?', value: 'How do I delete my vehicle?' },
      ],
      actions: [
        { type: 'navigate', label: 'My Listings', payload: { href: '/my-listings' } },
      ],
    },
  },

  {
    id: 'buy_sell.renew',
    module: MODULE,
    priority: 82,
    patterns: [
      /how (do|can|to).*renew/i,
      /renew.*(listing|vehicle|featured)/i,
      /extend.*(listing|featured)/i,
    ],
    article: {
      id: 'buy_sell.renew',
      module: MODULE,
      title: 'How to renew a listing',
      intro:
        'Visibility renewals are handled through **Feature Your Vehicle** packages (and keeping the listing Active).',
      steps: [
        { title: 'Open My Listings', body: 'Select the vehicle you want to renew / boost.' },
        { title: 'Feature / renew package', body: 'Open featured plans and choose a package again if the previous one expired.' },
        { title: 'Complete payment', body: 'Pay to reactivate featured placement and improve visibility.' },
        { title: 'Confirm status', body: 'Check featured status and expiry on the listing.' },
      ],
      related: [
        { label: 'How do Featured Vehicles work?', value: 'How do Featured Vehicles work?' },
        { label: 'Show my featured vehicles', value: 'Show my featured vehicles' },
      ],
      actions: [
        { type: 'navigate', label: 'Feature plans', payload: { href: '/featured' } },
      ],
    },
  },

  {
    id: 'buy_sell.report',
    module: MODULE,
    priority: 75,
    patterns: [
      /how (do|can|to).*report/i,
      /report.*(vehicle|listing|seller)/i,
    ],
    article: {
      id: 'buy_sell.report',
      module: MODULE,
      title: 'How to report a vehicle',
      steps: [
        { title: 'Open vehicle details', body: 'Open the listing you want to report.' },
        { title: 'Click Report', body: 'Use the **Report** action on the detail page (when available).' },
        { title: 'Select reason', body: 'Choose why you are reporting (spam, fraud, incorrect info, etc.).' },
        { title: 'Submit', body: 'Submit the report so the team can review it.' },
      ],
      tips: [
        'If Report is not visible on a screen, contact support with the listing ID / BS number.',
      ],
      related: [
        { label: 'How do I chat with the seller?', value: 'How do I chat with the seller?' },
      ],
      actions: [
        { type: 'navigate', label: 'Browse vehicles', payload: { href: '/list' } },
      ],
    },
  },

  {
    id: 'buy_sell.share',
    module: MODULE,
    priority: 75,
    patterns: [
      /how (do|can|to).*share/i,
      /share.*(vehicle|listing|link)/i,
    ],
    article: {
      id: 'buy_sell.share',
      module: MODULE,
      title: 'How to share a vehicle',
      steps: [
        { title: 'Open vehicle details', body: 'Open the listing you want to share.' },
        { title: 'Click Share', body: 'Use the **Share** control on the detail page.' },
        { title: 'Copy or share', body: 'Copy the link or share via supported apps on your device.' },
      ],
      related: [
        { label: 'How do I buy a vehicle?', value: 'How do I buy a vehicle?' },
      ],
      actions: [
        { type: 'navigate', label: 'Browse vehicles', payload: { href: '/list' } },
      ],
    },
  },

  {
    id: 'buy_sell.not_visible',
    module: MODULE,
    priority: 93,
    patterns: [
      /why.*(not|isn'?t|isnt).*visible/i,
      /vehicle.*(not showing|not visible|pending|rejected)/i,
      /listing.*(not live|not active|not approved)/i,
      /why.*(pending|rejected)/i,
    ],
    article: {
      id: 'buy_sell.not_visible',
      module: MODULE,
      title: 'Why isn’t my vehicle visible?',
      intro: 'Buyers usually only see **Active** listings. Check these common reasons:',
      steps: [
        { title: 'Still Pending', body: 'If status is **Pending**, wait for approval.' },
        { title: 'Rejected', body: 'If **Rejected**, edit details/images and resubmit if allowed, or contact support.' },
        { title: 'Draft', body: 'Draft listings are not public — publish/submit them from **My Listings**.' },
        { title: 'Inactive / Sold', body: 'Inactive or Sold listings are hidden from normal browse.' },
        { title: 'Wrong filters', body: 'Buyers may have category/price/location filters that exclude your vehicle.' },
      ],
      related: [
        { label: 'Show pending listings', value: 'Show pending listings' },
        { label: 'How do I edit my vehicle?', value: 'How do I edit my vehicle?' },
        { label: 'How do I post a vehicle?', value: 'How do I post a vehicle?' },
      ],
      actions: [
        { type: 'navigate', label: 'My Listings', payload: { href: '/my-listings' } },
      ],
    },
  },
];

const SUGGESTIONS = [
  'How do I post a vehicle?',
  'How do I buy a vehicle?',
  'How do I make an offer?',
  'How do Featured Vehicles work?',
  'How do Favorites work?',
  'How do I chat with the seller?',
  'How do I search vehicles?',
  'Why isn’t my vehicle visible?',
  'How do payments work?',
  'Where can I see my offers?',
];

module.exports = {
  MODULE,
  INTENTS,
  SUGGESTIONS,
};
