# Style C: margin doodles

## The system in five lines
1. One character per picture: a lumpy potato-headed person with stick limbs, drawn in a single wobbly navy marker line (#1C2541). There is no separate AI figure; the AI shows up as the object that has taken over that part of your life.
2. The only fill is a loose white marker scribble behind the line, set slightly off-register so the line still reads on dark cards. Almost everything else is outline.
3. Family marks: a curl of hair, heavy flat eyelids (deadpan), a hook nose, a sack body, scribbled black shoes. Head and body are the same size in all four.
4. One accent per drawing, also scribbled: yellow (#FFC83D) for paper things (pencil, sticky note, ring), pink (#FF8FA8) for feelings and organs (hearts, cheeks, brain).
5. The type changes what the person is, not what they wear: smug human, puppet, headless body, bride. That way they still look different at 64 px.

## The four drawn
- ANALOG: smug, eyelids low, holding up a hand-done long division (3)96 = 32), pencil behind the ear.
- CC-BOT: a ventriloquist-dummy marionette. A chat bubble ("...") holds the strings, and the dummy holds out a heart with a painted grin.
- 404: the head is a dashed outline with a "BRB" sticky note on it. The brain walks off with a suitcase.
- MY-BOT: a bride in a veil, eyes shut, cheek pressed to a phone wearing a top hat. The phone's screen just says "?".

## The other ten, one line each
- PLUG-IN: a person with a coiled charging cord running from the back of the head into a wall outlet, with a battery drawn on the chest. (Drawn: the cord comes from the head, not the legs; legs-as-cord did not read.)
- SAMPLER: a person holding a pie on a plate, cut into five exactly equal slices, one bite out of each, knife in the other hand. (The plate is what makes it read as food, not a gear.)
- PLUS-1: a person in bed under the covers at 2 a.m., face lit by the phone on the next pillow, which has its own little nightcap.
- TLDR: a person sitting on a giant closed textbook, reading a tiny chat-bubble note. (Changed from fast-forward eyes, which read as an expression, not as skimming.)
- CRAMBOT: a person at a library desk next to a phone in a graduation cap, holding up an "A" they gave it.
- NOTED: a person with spray bottle and rag polishing a giant envelope until it sparkles.
- SYNERGY: a bedsheet ghost (ghostwriter) with a shirt collar and tie over the sheet, holding a briefcase.
- HAHA-OK: a person squinting through a magnifying glass at a speech bubble that says "k".
- IDK: a person flicking a coin, eyes shut; the coin has a pink chat bubble stamped on its face. (A bubble-shaped coin read as a balloon.)
- SORRY: a person bowing to a phone in a flowerpot while watering it.

## Still weak
- The line looks hand-drawn but evenly so. The wobble comes from a seeded generator, and a real hand would vary the line weight more. A few lines retraced by hand would help.
- MY-BOT is the busiest (9.7 KB, close to the 10 KB limit). The two arms meet near the bottom of the phone, and at 64 px the top hat is just a dark blob.
- CC-BOT's strings are 3 units wide and almost disappear at 64 px. There it reads as "bubble over a grinning face" rather than "puppet".
- The 3)96 sum on ANALOG becomes texture at 64 px. What carries it small is the paper plus the pencil.
- The four bodies are the same sack on purpose. Over all 14, the pose and the prop have to do the work, or it turns into the same figure in a different hat.

Files: build.js is the only source. `node build.js` writes out/<type id>.svg for all 14 (seeded, so a rebuild is byte-identical). Coordinates are whole units to keep files under 10 KB. On the six dark cards, limbs and shoes get a white halo (DARK_CARDS in build.js); merged and brain_lite are mirrored (MIRROR) so the set does not all face right.
