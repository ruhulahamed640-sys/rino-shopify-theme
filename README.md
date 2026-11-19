# RINO — Premium Streetwear Shopify Online Store 2.0 Theme

**Tagline:** WEAR YOUR IDENTITY.  
**Campaign Headline:** OWN YOUR STREET.  
**Architecture:** Shopify Online Store 2.0 (Liquid, JSON Templates, Section Groups, Vanilla CSS & JS — zero external frontend frameworks).

## Design System
- **Primary Background:** `#111111`
- **Secondary Surface:** `#191919`
- **Primary Text:** `#F4F1EB`
- **Secondary Text:** `#A5A19A`
- **Accent Orange:** `#FF5A1F`
- **Border:** `#333333`
- **White / Black:** `#FFFFFF` / `#000000`
- **Typography:** Oswald (Display / Uppercase Headings) & DM Sans (Body) via Shopify Font Picker
- **Radius Tokens:** `24px` cards/containers, `12px` buttons/inputs

## Directory Structure
```text
rino-shopify-theme/
├── assets/
│   ├── icon-rino-mark.svg
│   ├── rino.css
│   └── rino.js
├── config/
│   ├── settings_data.json
│   └── settings_schema.json
├── layout/
│   ├── password.liquid
│   └── theme.liquid
├── locales/
│   └── en.default.json
├── sections/
│   ├── announcement-bar.liquid
│   ├── featured-collection.liquid
│   ├── footer-group.json
│   ├── footer.liquid
│   ├── header-group.json
│   ├── header.liquid
│   ├── hero.liquid
│   ├── image-text.liquid
│   ├── main-404.liquid
│   ├── main-cart.liquid
│   ├── main-collection.liquid
│   ├── main-contact.liquid
│   ├── main-page.liquid
│   ├── main-password.liquid
│   ├── main-product.liquid
│   ├── main-search.liquid
│   ├── marquee.liquid
│   ├── newsletter.liquid
│   ├── promotional-banner.liquid
│   └── related-products.liquid
├── snippets/
│   ├── cart-drawer.liquid
│   ├── icon.liquid
│   ├── meta-tags.liquid
│   ├── pagination.liquid
│   ├── price.liquid
│   └── product-card.liquid
├── templates/
│   ├── 404.json
│   ├── cart.json
│   ├── collection.json
│   ├── index.json
│   ├── page.about.json
│   ├── page.contact.json
│   ├── page.json
│   ├── password.json
│   ├── product.json
│   └── search.json
├── VALIDATION_REPORT.md
└── README.md
```

## Installation

### Option 1: Connect via GitHub (Recommended)
1. Extract `rino-shopify-theme.zip` and push the contents of `rino-shopify-theme/` to a GitHub repository (the root of the repo should contain `assets/`, `config/`, `layout/`, `locales/`, `sections/`, `snippets/`, `templates/`).
2. In **Shopify Admin**, go to **Online Store → Themes**.
3. Click **Add theme → Connect from GitHub**.
4. Authorize GitHub, select your repository and branch (`main`), and click **Connect**.

### Option 2: Direct ZIP Upload
1. In **Shopify Admin**, go to **Online Store → Themes**.
2. Click **Add theme → Upload zip file** and upload `rino-shopify-theme.zip` (note: upload a zip whose root contains `assets/`, `config/`, etc. directly).

## Store Setup Checklist
1. **Navigation:** Configure `main-menu` and `footer` in **Online Store → Navigation**.
2. **Products & Variants:** Create your custom-printed T-shirt products in **Products** with a `Size` option (`XS`, `S`, `M`, `L`, `XL`, `XXL`) and real inventory counts. The product page automatically renders all real Shopify variants and live stock status.
3. **Storefront Filtering:** Install or open the **Shopify Search & Discovery** app to enable Availability, Price, and Size filters on collection pages.
4. **Pages:** Create **About** (assign template `page.about`) and **Contact** (assign template `page.contact`) in **Online Store → Pages**.
5. **Theme Editor:** Open **Customize** to upload your editorial hero/campaign photography, pick your Featured Collection, and configure social media links.

## Local Development & Validation
If you have Shopify CLI installed locally:
```bash
shopify theme check
shopify theme dev --store your-store.myshopify.com
```
# rino-shopify-theme
