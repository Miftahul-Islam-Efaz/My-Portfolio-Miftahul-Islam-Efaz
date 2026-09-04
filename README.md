<p align="center">
  <img src="https://lh3.googleusercontent.com/d/1sqcXF54hCAOozQFHOTyYbTs4F-8qVqGq" alt="Miftahul Islam Efaz - portfolio" width="100%" />
</p>

<h1 align="center">Miftahul Islam Efaz</h1>

<p align="center">
  <a href="https://www.miftahulislamefaz.xyz">miftahulislamefaz.xyz</a>
</p>

---

A portfolio built as an experience rather than a document.

Most developer portfolios are a list. This one is a room you move through: the work arrives as depth-sorted cards drifting past in a 3D gallery, case studies open as full-screen overlays instead of pages, and the scroll carries weight because it is inertial rather than instant. Every transition is authored. The intent was to make the site itself the strongest piece of evidence in it.

Underneath the cinematography it is a straightforward, boring-on-purpose application: server-rendered Next.js, typed end to end, with a database behind every image and every line of copy.

## Built with

- **Next.js (App Router)** and **TypeScript**
- **GSAP** for sequenced timelines, **Lenis** for inertial scrolling
- **WebGL** canvas work for the hero and transitions
- **Supabase** (Postgres) for content, with a custom admin panel
- **Tailwind CSS** alongside hand-written stylesheets where motion needed the control

## Notes on the build

**Everything is editable.** Nothing on the site is hardcoded markup. Projects, case studies, the vault, the image slots and the SEO copy all live in Postgres and are edited through an admin panel at `/admin` — no redeploy to change a sentence.

**Motion has a budget.** The galleries hold 60fps by keeping per-frame work off the layout path: transforms and filters only, with the motion-blur filter region kept tight, because rasterising a larger area than the field is how a smear effect quietly costs you a third of your frame time. Touch devices and `prefers-reduced-motion` get deliberately simplified paths rather than a scaled-down version of the same animation.

**A canvas cannot be read.** A site drawn in WebGL is invisible to anything that does not run JavaScript, which includes most AI crawlers. So the same content is served three more ways: a screen-reader summary section in the HTML, a JSON-LD `@graph` describing the person and the work, and a generated `/llms.txt`. All three are built from the same database rows as the visible site, so they cannot drift out of step with it.

**The panel has one form.** The admin UI is schema-driven — adding a column means adding a line to a spec, not writing another form. Nine bespoke forms would have drifted apart within a week.

## Running it

```bash
npm install
cp .env.local.example .env.local   # add your Supabase keys
npm run dev
```

The site runs at `localhost:3000`, the panel at `localhost:3000/admin`.

Without Supabase credentials the app still boots: every content fetcher falls back to a last-known-good default rather than throwing, so a missing key costs you the live content, not the site.

## Contact

- **Email** — [hello@miftahulislamefaz.xyz](mailto:hello@miftahulislamefaz.xyz)
- **LinkedIn** — [miftahul-islam-efaz](https://www.linkedin.com/in/miftahul-islam-efaz-a91373284/)
- **X** — [@Miftahul_Islam9](https://x.com/Miftahul_Islam9)
- **Instagram** — [@miftahul_islam_efaz](https://www.instagram.com/miftahul_islam_efaz/)

---

<p align="center">Turning ideas into systems. Systems into legacy.</p>
