"""从 App 字体生成网站用字：固化 ROND=100，保留 400–700 可变字重。"""

import argparse
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

website_root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument(
    "android_project",
    nargs="?",
    type=Path,
    default=website_root.parent / "BiliTools",
    help="Android 项目根目录，默认使用兄弟目录 ../BiliTools",
)
android_project_root = parser.parse_args().android_project.resolve()
font = TTFont(android_project_root / "app/src/main/res/font/google_sans_flex.ttf")
options = subset.Options()
options.name_IDs = ["*"]
options.name_legacy = True
options.name_languages = ["*"]
options.recalc_timestamp = False
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=range(0x20, 0x250))
subsetter.subset(font)
instantiateVariableFont(
    font,
    {"wght": (400, 700), "ROND": 100, "opsz": 18, "wdth": 100, "GRAD": 0, "slnt": 0},
    inplace=True,
)
font.flavor = "woff2"
output_path = website_root / "public/assets/google-sans-flex.woff2"
output_path.parent.mkdir(parents=True, exist_ok=True)
font.save(output_path)
print(f"Prepared {output_path.name}: {output_path.stat().st_size:,} bytes; ROND=100, variable weight 400–700.")
