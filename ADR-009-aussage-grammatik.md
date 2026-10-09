# ADR-009 — Aussage-Grammatik als Treatment

## Status

Vorgeschlagen.

## Context

Inhalte auf einer Website machen fast immer eine von fünf Arten von Aussagen: etwas *ist* (Identität), *hat* (Eigenschaft, Angabe), *kann* (Möglichkeit, Angebot), *tut* (Handlung, Ablauf) oder *steht in Verbindung mit* etwas anderem. Bisher trägt nur der Text diese Unterscheidung. Gesucht war eine leise, wiedererkennbare Form, die sie mitträgt, ohne selbst zum dominanten Gestaltungselement zu werden, und eine Art, Beziehungen zwischen Inhalten über die ganze Seite hinweg zu zeigen.

Die Form muss auf beliebigen Trägern liegen können (Card, Section, Service-Card, CTA-Band), darf deren Contracts nicht brechen und muss in allen Tones, beiden Modes und auf inversen Flächen funktionieren. Sie darf nicht auf Farbe beruhen.

## Decision

1. **Form statt Farbe.** Die Struktur hält den Inhalt oben und unten wie eine Halterung; ihre Form unterscheidet die fünf Arten: voller Rand (ist), Rand mit feiner Auslassung (hat), Rand mit Schräge von oben rechts nach unten links (kann), Rand über die halbe Breite oben links und unten rechts (tut), feine eingerückte Masslinie mit Endstrichen (verbunden). Die Linienfarbe ist die Textfarbe zu 24 Prozent (`currentColor`), damit sie jeder Fläche folgt.

2. **Ebene `treatments`.** Die Grammatik liegt nach `patterns`, damit Muster mit eigener `background`-Kurzschreibweise die Linien nicht überschreiben. Das Builder-Profil sieht diese Ebene seit 0.32.0 vor; `main.css` deklariert sie jetzt ebenfalls.

3. **Hintergrundebenen statt Pseudo-Elementen.** Gezeichnet wird mit `background-image`-Gradients. Viele Components nutzen `::before`/`::after`; Hintergrundebenen kollidieren damit nicht und brauchen kein `position: relative`. Ein eigenes Hintergrundbild gibt das Element über `--aussage-unter` weiter. Die Aussage ersetzt den sichtbaren Rahmen des Trägers (Randfarbe transparent, Breite bleibt, kein Layoutsprung).

4. **Die Schräge bei «kann» läuft hinter dem Inhalt durch.** Eine durchgehende Schräge mitten über den Inhalt liest sich als «durchgestrichen», also als das Gegenteil von «kann», und kreuzt auf schmalen Viewports den Text. Sichtbar sind darum nur die Ansätze oben rechts und unten links am Rand. Die durchgehende Fassung bleibt als `aussage--kann-durchgehend` für Bildkacheln ohne Text in der Mitte.

5. **Beziehung als Passermarke.** Wie im Druck zeigen Passermarken, was zusammengehört: Elemente derselben Beziehung tragen an derselben Stelle ihres Randes einen kurzen Querstrich, oben und unten. Vier Stellen im Goldenen Schnitt (23.6, 38.2, 61.8, 76.4 Prozent), gewählt mit `data-bezug="1"` bis `"4"`. Mehr als vier gleichzeitige Beziehungen auf einer Seite wären kein leiser Hinweis mehr. Hover, Fokus und Anker verlängern über `:has()` die Marken aller Elemente derselben Beziehung — eine Formänderung ohne Bewegung, ohne JavaScript.

6. **Hinweis, nicht Träger.** Die Bedeutung steht im Inhalt. Wo eine Beziehung für die Nutzung wichtig ist, gehört sie zusätzlich als echter Link ins Markup.

## Consequences

- Vollprofil +0.9 KB gzip (23.9 → 24.8 KB, Budget 26.4 KB); Builder-Profil unverändert.
- Ein Träger mit eigenem Hintergrundbild muss es über `--aussage-unter` weitergeben.
- Die Passermarken sitzen proportional zur Breite; bei gleich breiten Elementen fluchten sie exakt, bei verschieden breiten an derselben relativen Stelle.
- Erzwungene Farben zeichnen die Linien in `CanvasText`; Leserichtung rechts nach links spiegelt «tut» und «kann».

## Alternatives considered

- **Pseudo-Elemente:** sauberere Schräge, aber Kollision mit bestehenden `::before`/`::after` und Zwang zu `position: relative`.
- **`border-image`:** kann pro Kante keine unterschiedlichen Teilstücke (halbe Breite oben links, unten rechts) ohne Bildtricks.
- **Farbe je Aussageart:** widerspricht dem Ziel, leise zu bleiben, und trägt für Menschen mit Farbsehschwäche keine Information.
- **Verbindungslinien zwischen Elementen (SVG-Overlay):** zeigt Beziehungen explizit, ist aber laut, layoutabhängig und braucht JavaScript.
