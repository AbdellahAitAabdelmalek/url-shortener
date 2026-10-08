/** Shown to browsers on unknown short links and pages. It never echoes the requested URL. */
export const NOT_FOUND_PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Link not found</title>
    <style>
      body {
        margin: 0;
        min-height: 100svh;
        display: grid;
        place-items: center;
        padding: 16px;
        font-family: system-ui, sans-serif;
        background: #fafafa;
        color: #171717;
      }
      main { max-width: 28rem; text-align: center; }
      h1 { margin: 0 0 0.5rem; font-size: 1.5rem; }
      p { margin: 0 0 1.5rem; color: #525252; }
      a {
        display: inline-block;
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        background: #171717;
        color: #fafafa;
        text-decoration: none;
      }
      @media (prefers-color-scheme: dark) {
        body { background: #0a0a0a; color: #fafafa; }
        p { color: #a3a3a3; }
        a { background: #fafafa; color: #171717; }
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Link not found</h1>
      <p>This short link does not exist. Check that it was copied entirely.</p>
      <a href="/">Shorten a link</a>
    </main>
  </body>
</html>
`;
