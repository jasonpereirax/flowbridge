SEMANTIC CONTEXT:

- Purpose: Public marketing/portfolio landing page ("Home") for a digital designer.
  Single long scroll page that presents the person, selected clients, services, a
  4-step process, testimonials, and a contact/footer. No authentication, no data
  mutation — it is a static, content-driven page.

- Route: / (app/page.tsx). Public, statically rendered (Server Component, no "use client"
  unless a section needs interactivity).

- Sections (top to bottom) and the REPEATED patterns to factor as components:
    1. Hero — name headline, tagline, primary "Call to action" + secondary "-Or Call to action".
    2. About — heading + two paragraph columns.
    3. Selected Clients — a LIST of 5 identical rows (avatar dot + client name + "Website
       Institucional" + year + "See more"). Factor ONE <ProjectRow> and map over data.
    4. Services — 3 identical cards (title + description). Factor ONE <ServiceCard>, map 3x.
    5. Objective process — 4 identical circles (Define / Discover / Create / Deliver).
       Factor ONE <ProcessStep>, map 4x.
    6. Testimonials — 4 identical cards (avatar + name/handle + quote + "Website" link).
       Factor ONE <TestimonialCard>, map 4x.
    7. Footer — logo, MENU nav list, social links, copyright.

- Shared primitives to extract (design-system candidates):
    "Call to action"  -> <CTAButton variant="primary" | "link" /> (appears 3x across sections)
    Section header (label + plus icon) -> <SectionHeader title />  (Selected Clients,
       Objective process, Testimonials all share it)

- Data: no API. Define typed local data arrays (projects, services, processSteps,
  testimonials) in the same file or a colocated data module and map over them — do not
  hand-write each repeated block inline.

- State / notes:
    - No loading/error/empty states (static content).
    - Keep it a Server Component; only add "use client" if a specific interaction requires it.
    - Tailwind for all styling. Use semantic, reusable className patterns rather than
      duplicating long utility strings across the repeated items.

Use this context to place files correctly, extract the repeated patterns into reusable
components, and structure the data instead of inlining duplicated markup.
