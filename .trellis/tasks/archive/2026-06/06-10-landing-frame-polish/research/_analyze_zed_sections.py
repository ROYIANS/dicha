import re

html = open("zed.html", encoding="utf-8", errors="ignore").read()
main_start = html.find("<main>")
main_end = html.find("</main>")
main = html[main_start:main_end]

sections = re.findall(
    r'<section class="([^"]*outer-section-node-offset[^"]*)"[^>]*>(.*?)</section>',
    main,
    re.DOTALL,
)
print("main sections", len(sections))

for i, (cls, body) in enumerate(sections):
    cidx = body.find("container-max-w")
    left_part = body[:cidx] if cidx > 0 else body[: len(body) // 2]
    right_part = body[cidx:] if cidx > 0 else body[len(body) // 2 :]

    def rail_flags(part, side):
        has_ruler = "repeating-linear-gradient" in part or part.count("background-color:currentColor") >= 1
        has_barcode = "width:32px" in part
        return has_ruler, has_barcode

    ln_r, ln_b = rail_flags(left_part[:1200], "narrow-left")
    lf_r, lf_b = rail_flags(left_part[1200:], "flex-left")
    rf_r, rf_b = rail_flags(right_part[: len(right_part) // 2], "flex-right")
    rn_r, rn_b = rail_flags(right_part[-1200:], "narrow-right")

    print(
        f"sec{i:02d} | narrowL:{'R' if ln_r else '-'}{'B' if ln_b else '-'} "
        f"flexL:{'R' if lf_r else '-'}{'B' if lf_b else '-'} "
        f"flexR:{'R' if rf_r else '-'}{'B' if rf_b else '-'} "
        f"narrowR:{'R' if rn_r else '-'}{'B' if rn_b else '-'}"
    )
