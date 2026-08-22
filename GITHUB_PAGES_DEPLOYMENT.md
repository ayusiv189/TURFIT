# GitHub Pages / Custom Hosting Configuration

## 1. Routing / 404 Resolution on GitHub Pages
When deploying a single-page app (SPA) built with Vite to GitHub Pages:
1. GitHub Pages serves static files. If you refresh a subpage or if the base path is not configured, it will return a `404 Not Found`.
2. **GitHub Pages Base Path**:
   If your repository is hosted at `https://<username>.github.io/<repo-name>/`, update `vite.config.ts` to set the base path:
   ```ts
   // vite.config.ts
   export default defineConfig({
     base: '/<repo-name>/', // Replace with your repository name, or './' for relative paths
     // ...
   });
   ```
   Alternatively, setting `base: './'` allows the build artifacts to load properly under any repository subfolder.

3. **SPA 404 Fallback**:
   To handle direct routes and page refreshes on GitHub Pages, copy `index.html` to `404.html` in your `dist` or `public` directory.

## 2. Firebase Authorized Domains
If authentication or resource calls fail with 404/403:
- In the [Firebase Console](https://console.firebase.google.com/project/trufit-903e2/authentication/settings), under **Authorized Domains**, add:
  - `<your-username>.github.io`
  - Any custom domain you use (e.g. `yourdomain.com`)
