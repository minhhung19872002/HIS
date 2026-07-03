# Minimal-scope checklist (YAGNI)

## Before writing
- [ ] State in 1 sentence: "The SMALLEST change to get the requirement to done is …".
- [ ] List the files you MUST touch. Any other file = out of scope.
- [ ] Any abstraction/option/parameter "for the future"? → drop it.
- [ ] Is there a codebase precedent to follow? → follow it, don't invent.

## "YOU'RE OVERDOING IT" signals (stop)
- About to "while-I'm-here" refactor / rename / format outside the request.
- Adding a generic/`options`/config/flag nobody needs yet.
- Creating an abstraction parallel to an existing one (violates reuse).
- Touching files/areas not directly related.
- A diff unusually large for the request's complexity.

## Inspect the final diff
- [ ] Does each changed line DIRECTLY serve the request? No → drop it.
- [ ] Feature / refactor / format kept SEPARATE (not mixed)?
- [ ] Tech debt found → recorded as a **separate proposal**, not fixed inline.

## Principle
Correct-and-safe-enough first → then minimal. Prefer practical maintainability over theoretical perfection.
