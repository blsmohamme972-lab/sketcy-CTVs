# Screen direction — initial foundation

The original visual direction is a quiet study notebook: warm ivory surfaces,
forest-green emphasis, generous spacing, and simple book geometry. Use original
lesson artwork in later increments; do not copy Sketchy or Picmonic characters,
illustrations, branding, or layouts. No medical artwork is supplied at this stage.

The current app implements only the Library, Review, and Settings empty states.
Tabs are operable and restore selection after activity recreation. Content scrolls
to accommodate large text and small/landscape windows. Compose uses semantic text
and tab roles, Material touch targets, and the system dark-mode preference.
TalkBack, large-font, rotation, and device checks remain to be performed.

## Implemented shell

```text
Sketcy CTVS
[ Library ] [ Review ] [ Settings ]

Screen title
Brief introduction

┌──────────────────────────────────────┐
│ Empty-state title                    │
│ What belongs here / availability     │
└──────────────────────────────────────┘
```

The shell shows no invented lessons, review counts, inactive import button, or
settings switches that cannot save preferences.

## Planned screens (design notes only)

| Screen | Main content | Primary action |
| --- | --- | --- |
| Library | Search, specialty filter, bookmarked lessons, resume card | Import lesson ZIP |
| Lesson overview | Parts, objectives, completion, source references | Start/resume a part |
| Player | Illustration, explanation/story choice, captions, seek/speed controls | Play/pause |
| Symbol Explorer | Image hotspots, symbol list, hide/reveal meanings | Select a symbol |
| Review | One image-based question, concealed answer, then feedback | Submit/reveal, then rate |
| Progress/settings | Due counts, review history, playback preferences | Backup/restore |

Later player work must provide landscape fullscreen, manual image exploration,
and reduced motion. Narration switching will match fact/symbol anchors; audio
position will control captions and camera cues. These behaviors are not present
in this checkpoint.
