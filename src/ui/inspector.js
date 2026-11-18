/**
 * Inspector and legend panels.
 *
 * The inspector is intentionally direct: it shows the selected cell, selection
 * or group and offers only the actions that make sense for that object. User
 * text is written with textContent, never injected as HTML.
 */

import { groupSpan } from "../core/chart.js";
import { legendEntries } from "../core/legend.js";
import { getSymbol, glyphFor, symbolName } from "../core/symbols.js";
import { glyphToSvg } from "../core/render-svg.js";

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function labeled(labelText, control) {
  const wrapper = el("label", "field");
  wrapper.append(el("span", "field-label", labelText));
  wrapper.append(control);
  return wrapper;
}

function groupEditor(group, chart, { t, lang, onUpdateGroup, onRemoveGroup }) {
  const wrapper = el("div", "inspector-card");
  wrapper.append(el("h3", null, t("inspector.group")));
  wrapper.append(el("p", "muted", t("inspector.group.type") + ": " + symbolName(group.symbol, lang)));

  const span = groupSpan(chart, group);
  const meta = el("dl", "meta-list");
  meta.append(el("dt", null, t("inspector.row")));
  meta.append(el("dd", null, String(group.row)));
  meta.append(el("dt", null, t("inspector.column")));
  meta.append(el("dd", null, String(group.col)));
  meta.append(el("dt", null, t("inspector.group.span")));
  meta.append(el("dd", null, String(span)));
  wrapper.append(meta);

  const form = el("form", "inspector-form");
  const values = { ...group };

  if (group.symbol === "cable") {
    const left = el("input");
    left.type = "number";
    left.min = "1";
    left.max = "12";
    left.value = String(group.left);
    left.addEventListener("input", () => { values.left = Number(left.value); });
    form.append(labeled(t("inspector.group.left"), left));

    const right = el("input");
    right.type = "number";
    right.min = "1";
    right.max = "12";
    right.value = String(group.right);
    right.addEventListener("input", () => { values.right = Number(right.value); });
    form.append(labeled(t("inspector.group.right"), right));

    const direction = el("select");
    const front = el("option", null, t("inspector.group.direction.front"));
    front.value = "front";
    const back = el("option", null, t("inspector.group.direction.back"));
    back.value = "back";
    direction.append(front, back);
    direction.value = group.direction;
    direction.addEventListener("change", () => { values.direction = direction.value; });
    form.append(labeled(t("inspector.group.direction"), direction));
  } else if (group.symbol === "custom") {
    const label = el("input");
    label.type = "text";
    label.maxLength = 24;
    label.value = group.label || "";
    label.addEventListener("input", () => { values.label = label.value; });
    form.append(labeled(t("inspector.group.label"), label));

    const legend = el("textarea");
    legend.rows = 3;
    legend.maxLength = 160;
    legend.placeholder = t("palette.legendPlaceholder");
    legend.value = group.legend || "";
    legend.addEventListener("input", () => { values.legend = legend.value; });
    form.append(labeled(t("inspector.group.legend"), legend));
  }

  const actions = el("div", "button-row");
  const apply = el("button", "button primary", t("inspector.group.apply"));
  apply.type = "button";
  apply.addEventListener("click", () => onUpdateGroup(group, values));
  const remove = el("button", "button danger", t("inspector.group.remove"));
  remove.type = "button";
  remove.addEventListener("click", () => onRemoveGroup(group));
  actions.append(apply, remove);
  form.append(actions);
  wrapper.append(form);
  return wrapper;
}

export function renderInspector({ container, store, t, lang = "de", onUpdateGroup, onRemoveGroup, onFillSelection, onClearSelection }) {
  container.replaceChildren();
  const chart = store.chart;

  if (store.headerSelection) {
    const card = el("div", "inspector-card");
    card.append(el("h3", null, t("status.selected")));
    const label = store.headerSelection.kind === "row"
      ? t("chart.rowLabel")
      : t("chart.columnLabel");
    card.append(el("p", null, `${label} ${store.headerSelection.index}`));
    card.append(el("p", "hint", t("chart.deleteHeader")));
    container.append(card);
    return;
  }

  if (store.selectedGroupId) {
    const group = chart.groups.find((item) => item.id === store.selectedGroupId);
    if (group) {
      container.append(groupEditor(group, chart, { t, lang, onUpdateGroup, onRemoveGroup }));
      return;
    }
  }

  if (store.selection) {
    const top = Math.min(store.selection.row1, store.selection.row2);
    const bottom = Math.max(store.selection.row1, store.selection.row2);
    const left = Math.min(store.selection.col1, store.selection.col2);
    const right = Math.max(store.selection.col1, store.selection.col2);
    const card = el("div", "inspector-card");
    card.append(el("h3", null, t("inspector.selection")));
    card.append(el("p", "muted", `${t("chart.rowLabel")} ${top}–${bottom}, ${t("chart.stitchLabel")} ${left}–${right}`));
    card.append(el("p", null, t("inspector.selection.count", { count: (bottom - top + 1) * (right - left + 1) })));

    if (top === bottom && left === right) {
      const symbol = chart.rows[top - 1][left - 1];
      card.append(el("p", null, `${t("inspector.symbol")}: ${symbol ? symbolName(symbol, lang) : "–"}`));
    }

    const actions = el("div", "button-row");
    const fill = el("button", "button primary", t("inspector.fill"));
    fill.type = "button";
    fill.addEventListener("click", () => onFillSelection?.());
    const clear = el("button", "button", t("inspector.clear"));
    clear.type = "button";
    clear.addEventListener("click", () => onClearSelection?.());
    actions.append(fill, clear);
    card.append(actions);
    container.append(card);
    return;
  }

  const empty = el("p", "muted", t("inspector.none"));
  container.append(empty);
}

export function renderLegend({ container, chart, t, lang = "de" }) {
  container.replaceChildren();
  const entries = legendEntries(chart, lang);
  if (!entries.length) {
    container.append(el("p", "muted", t("chart.legend.empty")));
    return;
  }
  for (const entry of entries) {
    const row = el("div", "legend-row");
    const icon = el("span", "legend-icon");
    if (entry.kind === "color") {
      const swatch = el("span", "legend-swatch");
      swatch.style.background = entry.color.hex;
      icon.append(swatch);
    } else {
      icon.innerHTML = glyphToSvg(entry.glyph, {
        span: entry.span,
        width: 32,
        height: 22
      });
    }
    const text = el("span", "legend-text");
    text.append(el("strong", null, entry.name));
    if (entry.kind === "color") {
      text.append(el("span", "muted", entry.color.hex));
    } else if (entry.text) {
      text.append(el("span", "muted", entry.text));
    }
    row.append(icon, text);
    container.append(row);
  }
}
