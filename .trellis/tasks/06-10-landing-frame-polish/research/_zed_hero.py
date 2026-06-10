import re

html = open("zed.html", encoding="utf-8", errors="ignore").read()
main = html[html.find("<main>") : html.find("</main>")]

# first body section after header area
sections = re.findall(
    r'(<section class="relative flex[^"]*outer-section-node-offset[^"]*"[^>]*>.*?</section>)',
    main,
    re.DOTALL,
)
print("sections", len(sections))
for i, sec in enumerate(sections[:3]):
    print(f"\n=== section {i} len={len(sec)} ===")
    # rails
    left = sec[: sec.find("container-max-w")]
    right = sec[sec.rfind("container-max-w") :]
    print("left has barcode", "width:32px" in left)
    print("left has ruler", "repeating-linear-gradient" in left or left.count("background-color:currentColor") >= 2)
    # content area classes
    m = re.search(r"container-max-w[^>]*>\s*<div class=\"([^\"]+)\"", sec)
    if m:
        print("content wrapper:", m.group(1)[:200])
    # gradient
    for kw in ["bg-linear", "from-blue", "via-cream", "gradient", "opacity-8", "mask-image"]:
        if kw in sec:
            print("  kw:", kw)
    # announce/banner link
    if "group" in sec[:5000] or "announce" in sec.lower()[:5000]:
        print("  has group/banner in head")
    # hover on banner
    if "group-hover" in sec:
        print("  group-hover found")
    # save first section snippet
    if i == 0:
        open(".trellis/tasks/06-10-landing-frame-polish/research/zed-hero-snippet.txt", "w", encoding="utf-8").write(
            re.sub(r"\s+", " ", sec)[:8000]
        )
