/**
 * Symbol and colour palette.
 *
 * Everything here is data-driven. Adding a symbol to symbols.js makes it
 * appear in the palette; adding a cable preset makes a new one-click button.
 */

import {
  CABLE_PRESETS,
  CATEGORIES,
  SYMBOLS,
  glyphFor,
  symbolName
} from "../core/symbols.js";
import { glyphToSvg } from "../core/render-svg.js";

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function isSelected(store, id, params = {}) {
  if (store.symbol.id !== id) return false;
  if (id === "cable") {
    return store.symbol.left === params.left
      && store.symbol.right === params.right
      && store.symbol.direction === params.direction;
  }
  if (id === "custom") {
    return store.symbol.label === params.label && store.symbol.span === params.span;
  }
  return true;
}

function symbolButton({ id, params = {}, span, label, description, store, t, onClick }) {
  const button = element("button", "palette-item");
  button.type = "button";
  button.dataset.symbol = id;
  if (id === "cable") {
    button.dataset.left = String(params.left);
    button.dataset.right = String(params.right);
    button.dataset.direction = params.direction;
  } else if (id === "custom") {
    button.dataset.label = params.label;
    button.dataset.span = String(params.span);
  }
  button.setAttribute("aria-pressed", String(isSelected(store, id, params)));
  button.title = description || label;
  const preview = element("span", "palette-preview");
  preview.innerHTML = glyphToSvg(glyphFor(id, params), {
    span,
    width: 40,
    height: 30
  });
  button.append(preview);
  if (span > 1) {
    const badge = element("span", "badge", t("palette.groupBadge", { count: span }));
    button.append(badge);
  }
  button.append(element("span", "palette-label", label));
  button.addEventListener("click", () => onClick({ id, ...params }));
  return button;
}

/**
 * Render the palette. Returns nothing; call again after a language change or
 * a palette change.
 */
export function renderPalette({ symbolsEl, colorsEl, store, t, lang = "en", customGroups = [], customCables = [], onNewCable, onNewGroup, onAddColor }) {
  const query = (symbolsEl.dataset.query || "").trim().toLowerCase();
  symbolsEl.replaceChildren();

  for (const category of CATEGORIES) {
    const knitQuery = !query || "k knit re leer empty".includes(query);
    const items = Object.values(SYMBOLS).filter((symbol) => (
      symbol.category === category.id
      && !symbol.hidden
      && symbol.id !== "cable"
      && symbol.id !== "custom"
    ));
    if (!items.length) continue;

    const filtered = items.filter((symbol) => {
      if (!query) return true;
      const haystack = [
        symbol.id,
        symbolName(symbol.id, "de"),
        symbolName(symbol.id, "en"),
        symbol.legend?.de,
        symbol.legend?.en
      ].join(" ").toLowerCase();
      return haystack.includes(query);
    });
    if (!filtered.length && !(category.id === "basic" && knitQuery)) continue;

    symbolsEl.append(element("h3", "palette-category", category.name[lang] || category.name.en));
    const grid = element("div", "palette-grid");
    if (category.id === "basic" && knitQuery) {
      const knit = element("button", "palette-item");
      knit.type = "button";
      knit.title = t("palette.knit");
      knit.setAttribute("aria-label", t("palette.knit"));
      knit.setAttribute("aria-pressed", String(store.symbol.id === "k"));
      const preview = element("span", "palette-preview");
      preview.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" width="40" height="30" aria-hidden="true"><rect x="0.08" y="0.08" width="0.84" height="0.84" fill="none" stroke="currentColor" stroke-width="0.05"/></svg>`;
      knit.append(preview);
      knit.append(element("span", "palette-label", t("palette.knit")));
      knit.addEventListener("click", () => {
        store.setSymbol({ id: "k" });
        store.setTool("pencil");
      });
      grid.append(knit);
    }
    for (const symbol of filtered) {
      grid.append(symbolButton({
        id: symbol.id,
        span: symbol.span || 1,
        label: symbolName(symbol.id, lang),
        description: symbol.description?.[lang] || symbol.description?.en,
        store,
        t,
        onClick: (value) => {
          store.setSymbol(value);
          store.setTool("pencil");
        }
      }));
    }
    symbolsEl.append(grid);
  }

  // Cables get a dedicated section because the parameters matter.
  if (!query || "zopf cable".includes(query)) {
    symbolsEl.append(element("h3", "palette-category", t("palette.cablePresets")));
    const grid = element("div", "palette-grid palette-grid-cable");
    for (const preset of CABLE_PRESETS) {
      grid.append(symbolButton({
        id: "cable",
        params: { left: preset.left, right: preset.right, direction: preset.direction },
        span: preset.left + preset.right,
        label: preset.label[lang] || preset.label.en,
        description: `${preset.left}/${preset.right}`,
        store,
        t,
        onClick: (value) => {
          store.setSymbol({ id: "cable", left: value.left, right: value.right, direction: value.direction });
          store.setTool("pencil");
        }
      }));
    }
    const customCable = element("button", "palette-item palette-item-wide");
    customCable.type = "button";
    customCable.append(element("span", "palette-label", t("palette.customCable")));
    customCable.addEventListener("click", () => onNewCable?.());
    grid.append(customCable);
    symbolsEl.append(grid);
  }

  // Saved custom cables. The presets cover the common widths; these are the
  // combinations the person actually uses, kept outside the chart so they can
  // be placed again with one click.
  const customCableMatches = customCables.filter((cable) => {
    if (!query) return true;
    const direction = t(`inspector.group.direction.${cable.direction}`).toLowerCase();
    const haystack = `${cable.left}/${cable.right} ${direction} eigene custom own zopf cable`;
    return haystack.toLowerCase().includes(query);
  });
  if (customCableMatches.length) {
    symbolsEl.append(element("h3", "palette-category", t("palette.customCables")));
    const grid = element("div", "palette-grid");
    for (const cable of customCableMatches) {
      const direction = t(`inspector.group.direction.${cable.direction}`).toLowerCase();
      grid.append(symbolButton({
        id: "cable",
        params: { left: cable.left, right: cable.right, direction: cable.direction },
        span: cable.left + cable.right,
        label: `${cable.left}/${cable.right} ${direction}`,
        description: `${t("palette.customCable")} · ${cable.left}/${cable.right} ${direction}`,
        store,
        t,
        onClick: () => {
          store.setSymbol({
            id: "cable",
            left: cable.left,
            right: cable.right,
            direction: cable.direction
          });
          store.setTool("pencil");
        }
      }));
    }
    symbolsEl.append(grid);
  }

  // Reusable custom groups. They are stored outside the chart so the same
  // "TL"/"TR" group can be placed again without recreating it.
  const customMatches = customGroups.filter((group) => (
    !query || group.label.toLowerCase().includes(query) || "eigene custom own".includes(query)
  ));
  if (!query || customMatches.length || "eigene custom own".includes(query)) {
    symbolsEl.append(element("h3", "palette-category", t("category.custom")));
    const grid = element("div", "palette-grid");
    for (const group of customMatches) {
      grid.append(symbolButton({
        id: "custom",
        params: { span: group.span, label: group.label, legend: group.legend },
        span: group.span,
        label: group.label,
        description: group.legend || `${group.label} · ${t("palette.groupBadge", { count: group.span })}`,
        store,
        t,
        onClick: () => {
          store.setSymbol({
            id: "custom",
            span: group.span,
            label: group.label,
            legend: group.legend || ""
          });
          store.setTool("pencil");
        }
      }));
    }
    const newGroup = element("button", "palette-item palette-item-wide");
    newGroup.type = "button";
    newGroup.append(element("span", "palette-label", t("palette.newCustomGroup")));
    newGroup.addEventListener("click", () => onNewGroup?.());
    grid.append(newGroup);
    symbolsEl.append(grid);
  }

  // Colours
  if (!colorsEl) return;
  colorsEl.replaceChildren();
  const none = element("button", "color-swatch color-none");
  none.type = "button";
  none.title = t("palette.noColor");
  none.setAttribute("aria-label", t("palette.noColor"));
  none.dataset.selected = String(store.color === null);
  none.setAttribute("aria-pressed", String(store.color === null));
  none.addEventListener("click", () => store.setColor(null));
  colorsEl.append(none);

  for (const color of store.chart.palette) {
    const button = element("button", "color-swatch");
    button.type = "button";
    button.style.background = color.hex;
    button.title = `${color.name} (${color.hex})`;
    button.setAttribute("aria-label", `${color.name} ${color.hex}`);
    button.dataset.selected = String(store.color === color.id);
    button.setAttribute("aria-pressed", String(store.color === color.id));
    button.addEventListener("click", () => store.setColor(color.id));
    colorsEl.append(button);
  }

  const add = element("button", "color-swatch color-add");
  add.type = "button";
  add.title = t("palette.addColor");
  add.setAttribute("aria-label", t("palette.addColor"));
  add.textContent = "+";
  add.addEventListener("click", () => onAddColor?.());
  colorsEl.append(add);
}
