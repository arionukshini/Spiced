const artwork = `
  <path d="M16.5 7.8c-1.1-2.2-.3-4.2 2.1-5.3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <path fill-rule="evenodd" d="M16.4 7.2c2.8 0 4.8 2.1 4.5 4.9-.5 5.3-5.9 8.6-13.4 8.6-.7 0-1-.9-.4-1.3 3.5-2.1 4.8-4.3 4.7-7.1-.1-3 1.7-5.1 4.6-5.1Zm-.2 3a.8.8 0 0 0 0 1.6c.9 0 1.6.7 1.6 1.6a.8.8 0 0 0 1.6 0c0-1.8-1.4-3.2-3.2-3.2Z" clip-rule="evenodd"/>
`;

export const spicedIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${artwork}</svg>`;

// Menu.Item supplies the outer 16px SVG, so its artwork must use that coordinate space.
export const spicedMenuIcon = `<g transform="scale(${16 / 24})" fill="currentColor">${artwork}</g>`;
