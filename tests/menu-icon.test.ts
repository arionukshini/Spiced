import { describe, expect, it } from "vitest";
import { spicedIcon, spicedMenuIcon } from "../src/ui/brand-icon";

function renderNativeMenuIcon(markup: string): SVGSVGElement {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("data-encore-id", "icon");
  icon.style.width = "16px";
  icon.style.height = "16px";
  icon.innerHTML = markup;
  return icon;
}

describe("Spiced menu icon", () => {
  it("uses Spotify's existing SVG instead of nesting a clipped second viewport", () => {
    const icon = renderNativeMenuIcon(spicedMenuIcon);

    expect(icon.querySelector("svg")).toBeNull();
    expect(icon.firstElementChild?.tagName.toLowerCase()).toBe("g");
    expect(icon.querySelectorAll("path")).toHaveLength(2);
    expect(icon.firstElementChild?.getAttribute("fill")).toBe("currentColor");
  });

  it("fits the complete settings artwork into the native 16px coordinate space", () => {
    const header = document.createElement("div");
    header.innerHTML = spicedIcon;
    const headerIcon = header.querySelector("svg")!;
    const menuIcon = renderNativeMenuIcon(spicedMenuIcon);
    const transform = menuIcon.firstElementChild!.getAttribute("transform")!;
    const scale = Number(/^scale\(([\d.]+)\)$/.exec(transform)?.[1]);
    const [, , artworkWidth, artworkHeight] = headerIcon.getAttribute("viewBox")!.split(" ").map(Number);

    expect(artworkWidth! * scale).toBeCloseTo(16);
    expect(artworkHeight! * scale).toBeCloseTo(16);
    expect(Array.from(menuIcon.querySelectorAll("path"), (path) => path.outerHTML)).toEqual(
      Array.from(headerIcon.querySelectorAll("path"), (path) => path.outerHTML),
    );
    expect(headerIcon.getAttribute("width")).toBe("24");
    expect(headerIcon.getAttribute("height")).toBe("24");
  });
});
