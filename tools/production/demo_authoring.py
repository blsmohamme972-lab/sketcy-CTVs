#!/usr/bin/env python3
"""Write original, explicitly nonmedical authoring data for the library-tour technical demo."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def authoring(image):
    text = (ROOT / "tools/breeze/text/explanation.txt").read_text()
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    entries = [
        ("entrance", "Blue lantern", "The blue lantern marks the entrance. It has a handle and square glass panels.",
         {"x": .17, "y": .10, "width": .14, "height": .32}, 1),
        ("clock", "Clock and paper birds", "A round clock hangs above the reading table, with exactly three paper birds around it.",
         {"x": .35, "y": .03, "width": .33, "height": .43}, 2),
        ("boat", "Wooden boat", "The wooden boat rests on the windowsill with one white sail and a red flag.",
         {"x": .84, "y": .51, "width": .13, "height": .24}, 3),
    ]
    facts, symbols, questions = [], [], []
    choices = {
        "entrance": ("Which object marks the entrance?", ["A blue lantern", "A wooden boat", "A round clock"]),
        "clock": ("How many paper birds circle the clock?", ["Three", "One", "Five"]),
        "boat": ("What does the wooden boat carry?", ["One white sail and a red flag", "Two blue sails and a white flag", "One red sail and a blue flag"]),
    }
    taps = {"entrance": "Tap the object that marks the beginning of a visit.",
            "clock": "Tap the object above the reading table with exactly three birds around it.",
            "boat": "Tap the object with one white sail and a red flag."}
    for ident, label, fact, region, index in entries:
        reference = {"sourceId": "scene-text", "locator": f"passage {index+1}", "quote": paragraphs[index]}
        facts.append({"id": ident, "text": fact, "sources": [reference]})
        symbols.append({"id": ident, "partId": "library-tour", "label": label,
                        "meaning": fact, "factIds": [ident], "region": region})
        for kind, prompt in [("IMAGE_RECALL", "What does the highlighted object help you remember?"),
                             ("IMAGE_OCCLUSION", "What is hidden here, and what details belong to it?"),
                             ("TAP_SYMBOL", taps[ident]), ("MULTIPLE_CHOICE", choices[ident][0])]:
            q = {"id": ident+"-"+kind.lower().replace("_", "-"), "factId": ident, "partId": "library-tour",
                 "type": kind, "prompt": prompt, "answer": fact,
                 "explanation": "Recall the original scene: " + fact, "symbolId": ident,
                 "choices": [], "correctChoiceId": None}
            if kind == "MULTIPLE_CHOICE":
                # Stable ordering differs by fact; correct-answer identity stays explicit.
                options = [{"id": "choice-"+str(i), "text": value} for i, value in enumerate(choices[ident][1])]
                rotate = index % 3
                q["choices"] = options[rotate:]+options[:rotate]
                q["correctChoiceId"] = "choice-0"
            questions.append(q)
    return {"lesson": {"schemaVersion": 1, "lessonId": "imaginary-library", "revision": 1,
        "title": "The Lantern Library", "specialty": "Technical demo", "language": "en", "contentType": "TECHNICAL_DEMO",
        "sources": [{"id": "scene-text", "title": "Original nonmedical library scene", "sha256": hashlib.sha256(text.encode()).hexdigest(),
                     "userProvided": False, "excerpts": {f"passage {i+1}": p for i,p in enumerate(paragraphs)}}],
        "facts": facts, "parts": [{"id": "library-tour", "title": "A visit worth remembering",
            "objectives": ["Connect the entrance, reading table, and window to three memorable objects.",
                           "Try explanation and story narration, then recall the original scene."],
            "illustrationPath": "images/library.png", "factIds": [e[0] for e in entries]}],
        "symbols": symbols, "questions": questions,
        "quality": {"sourceCoverageReviewed": False, "audioReviewed": False, "reviewer": "",
                    "notes": "Original nonmedical technical demo. Structural, duration, and checksum checks only; human listening review is outstanding."}},
        "imageFiles": {"images/library.png": str(image.resolve())}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.output.resolve().is_relative_to(ROOT):
        parser.error("Keep generated authoring files outside the repository")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("x", encoding="utf-8") as out:
        json.dump(authoring(args.image), out, indent=2);out.write("\n")


if __name__ == "__main__":
    main()
