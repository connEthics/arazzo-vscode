# Third-party notices

*Arazzo for VS Code — by ConnEthics* is released under the [MIT License](LICENSE) © ConnEthics.
The VSIX bundles the third-party software listed below. Each component remains under its own license.

## ConnEthics shared packages (vendored in `vendor/@connethics/`)

| Component | License | Notes |
|---|---|---|
| `@connethics/arazzo-core` | MIT © 2026 ConnEthics | Bundled into `dist/extension.js` and the webview. Its license ships as `vendor/@connethics/arazzo-core/LICENSE`. |
| Arazzo Specification JSON Schemas 1.0 and 1.1 (OpenAPI Initiative) | Apache-2.0 | Embedded in `@connethics/arazzo-core`. Source: https://spec.openapis.org/arazzo/ |
| `@connethics/arazzo-flow` | MIT © 2026 ConnEthics | Bundled into the webview. Its license ships as `vendor/@connethics/arazzo-flow/LICENSE`. |

## Eclipse Layout Kernel (elkjs), EPL-2.0

`webview-ui/build/assets/elk-worker.js` is an unmodified copy of `elkjs/lib/elk-worker.min.js`
(Eclipse Layout Kernel, https://github.com/kieler/elkjs, Copyright (c) Kiel University and others),
distributed under the **Eclipse Public License 2.0**. The full license text ships in the VSIX at
`vendor/@connethics/arazzo-flow/dist/elk-worker.LICENSE.md`. Source code: https://github.com/kieler/elkjs
and https://github.com/eclipse/elk.

## npm packages

These are the production dependencies of the extension (bundled by webpack into `dist/extension.js`) and of
the webview (bundled by Vite into `webview-ui/build/`). Tree-shaking can leave some of them out of
the final bundles. Type-only packages (`@types/*`) are not listed.

| Package | Version | License | Used by | Copyright |
|---|---|---|---|---|
| `@ungap/structured-clone` | 1.3.0 | ISC | webview | Copyright (c) 2021, Andrea Giammarchi, @WebReflection |
| `@xyflow/react` | 12.12.1 | MIT | webview | Copyright (c) 2019-2025 webkid GmbH |
| `@xyflow/system` | 0.0.84 | MIT | webview | Copyright (c) 2019-2025 webkid GmbH |
| `bail` | 2.0.2 | MIT | webview | Copyright (c) 2015 Titus Wormer <tituswormer@gmail.com> |
| `ccount` | 2.0.1 | MIT | webview | Copyright (c) 2015 Titus Wormer <tituswormer@gmail.com> |
| `character-entities` | 2.0.2 | MIT | webview | Copyright (c) 2015 Titus Wormer <tituswormer@gmail.com> |
| `character-entities-html4` | 2.1.0 | MIT | webview | Copyright (c) 2015 Titus Wormer <tituswormer@gmail.com> |
| `character-entities-legacy` | 3.0.0 | MIT | webview | Copyright (c) 2015 Titus Wormer <tituswormer@gmail.com> |
| `character-reference-invalid` | 2.0.1 | MIT | webview | Copyright (c) 2015 Titus Wormer <tituswormer@gmail.com> |
| `classcat` | 5.0.5 | MIT | webview | Copyright © Jorge Bucaran <<https://jorgebucaran.com>> |
| `clsx` | 2.1.1 | MIT | webview | Copyright (c) Luke Edwards <luke.edwards05@gmail.com> (lukeed.com) |
| `comma-separated-tokens` | 2.0.3 | MIT | webview | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `csstype` | 3.2.3 | MIT | webview | Copyright (c) 2017-2018 Fredrik Nicol |
| `d3-color` | 3.1.1 | ISC | webview | Copyright 2010-2026 Mike Bostock |
| `d3-dispatch` | 3.0.2 | ISC | webview | Copyright 2010-2026 Mike Bostock |
| `d3-drag` | 3.0.1 | ISC | webview | Copyright 2010-2026 Mike Bostock |
| `d3-ease` | 3.0.2 | BSD-3-Clause | webview | Copyright 2010-2026 Mike Bostock<br>Copyright 2001 Robert Penner |
| `d3-interpolate` | 3.0.2 | ISC | webview | Copyright 2010-2026 Mike Bostock |
| `d3-selection` | 3.0.1 | ISC | webview | Copyright 2010-2026 Mike Bostock |
| `d3-timer` | 3.0.2 | ISC | webview | Copyright 2010-2026 Mike Bostock |
| `d3-transition` | 3.0.2 | ISC | webview | Copyright 2010-2026 Mike Bostock |
| `d3-zoom` | 3.0.1 | ISC | webview | Copyright 2010-2026 Mike Bostock |
| `debug` | 4.4.3 | MIT | webview | Copyright (c) 2014-2017 TJ Holowaychuk <tj@vision-media.ca><br>Copyright (c) 2018-2021 Josh Junon |
| `decode-named-character-reference` | 1.2.0 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `dequal` | 2.0.3 | MIT | webview | Copyright (c) Luke Edwards <luke.edwards05@gmail.com> (lukeed.com) |
| `devlop` | 1.1.0 | MIT | webview | Copyright (c) 2023 Titus Wormer <tituswormer@gmail.com> |
| `elkjs` | 0.11.1 | EPL-2.0 | webview | Kiel University and others (see the EPL-2.0 section above) |
| `escape-string-regexp` | 5.0.0 | MIT | webview | Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com) |
| `estree-util-is-identifier-name` | 3.0.0 | MIT | webview | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `extend` | 3.0.2 | MIT | webview | Copyright (c) 2014 Stefan Thomas |
| `hast-util-to-jsx-runtime` | 2.3.6 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `hast-util-whitespace` | 3.0.0 | MIT | webview | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `html-to-image` | 1.11.13 | MIT | webview | Copyright (c) 2017-2025 W.Y. |
| `html-url-attributes` | 3.0.1 | MIT | webview | Copyright (c) Titus Wormer |
| `inline-style-parser` | 0.2.7 | MIT | webview | Copyright (c) 2012 TJ Holowaychuk <tj@vision-media.ca> |
| `is-alphabetical` | 2.0.1 | MIT | webview | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `is-alphanumerical` | 2.0.1 | MIT | webview | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `is-decimal` | 2.0.1 | MIT | webview | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `is-hexadecimal` | 2.0.1 | MIT | webview | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `is-plain-obj` | 4.1.0 | MIT | webview | Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com) |
| `longest-streak` | 3.1.0 | MIT | webview | Copyright (c) 2015 Titus Wormer <mailto:tituswormer@gmail.com> |
| `lucide-react` | 0.577.0 | ISC | webview | Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2026 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2026.<br>Copyright (c) 2013-2026 Cole Bemis |
| `markdown-table` | 3.0.4 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `mdast-util-find-and-replace` | 3.0.2 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `mdast-util-from-markdown` | 2.0.2 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `mdast-util-gfm` | 3.1.0 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `mdast-util-gfm-autolink-literal` | 2.0.1 | MIT | webview | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `mdast-util-gfm-footnote` | 2.1.0 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `mdast-util-gfm-strikethrough` | 2.0.0 | MIT | webview | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `mdast-util-gfm-table` | 2.0.0 | MIT | webview | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `mdast-util-gfm-task-list-item` | 2.0.0 | MIT | webview | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `mdast-util-mdx-expression` | 2.0.1 | MIT | webview | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `mdast-util-mdx-jsx` | 3.2.0 | MIT | webview | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `mdast-util-mdxjs-esm` | 2.0.1 | MIT | webview | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `mdast-util-phrasing` | 4.1.0 | MIT | webview | Copyright (c) 2017 Titus Wormer <tituswormer@gmail.com><br>Copyright (c) 2017 Victor Felder <victor@draft.li> |
| `mdast-util-to-hast` | 13.2.1 | MIT | webview | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `mdast-util-to-markdown` | 2.1.2 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `mdast-util-to-string` | 4.0.0 | MIT | webview | Copyright (c) 2015 Titus Wormer <tituswormer@gmail.com> |
| `micromark` | 4.0.2 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `micromark-core-commonmark` | 2.0.3 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `micromark-extension-gfm` | 3.0.0 | MIT | webview | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `micromark-extension-gfm-autolink-literal` | 2.1.0 | MIT | webview | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `micromark-extension-gfm-footnote` | 2.1.0 | MIT | webview | Copyright (c) 2021 Titus Wormer <tituswormer@gmail.com> |
| `micromark-extension-gfm-strikethrough` | 2.1.0 | MIT | webview | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `micromark-extension-gfm-table` | 2.1.1 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `micromark-extension-gfm-tagfilter` | 2.0.0 | MIT | webview | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `micromark-extension-gfm-task-list-item` | 2.1.0 | MIT | webview | Copyright (c) 2020 Titus Wormer <tituswormer@gmail.com> |
| `micromark-factory-destination` | 2.0.1 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `micromark-factory-label` | 2.0.1 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `micromark-factory-space` | 2.0.1 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `micromark-factory-title` | 2.0.1 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `micromark-factory-whitespace` | 2.0.1 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `micromark-util-character` | 2.1.1 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `micromark-util-chunked` | 2.0.1 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `micromark-util-classify-character` | 2.0.1 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `micromark-util-combine-extensions` | 2.0.1 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `micromark-util-decode-numeric-character-reference` | 2.0.2 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `micromark-util-decode-string` | 2.0.1 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `micromark-util-encode` | 2.0.1 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `micromark-util-html-tag-name` | 2.0.1 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `micromark-util-normalize-identifier` | 2.0.1 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `micromark-util-resolve-all` | 2.0.1 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `micromark-util-sanitize-uri` | 2.0.1 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `micromark-util-subtokenize` | 2.1.0 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `micromark-util-symbol` | 2.0.1 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `micromark-util-types` | 2.0.2 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `ms` | 2.1.3 | MIT | webview | Copyright (c) 2020 Vercel, Inc. |
| `parse-entities` | 4.0.2 | MIT | webview | Copyright (c) Titus Wormer <mailto:tituswormer@gmail.com> |
| `property-information` | 7.1.0 | MIT | webview | Copyright (c) Titus Wormer <mailto:tituswormer@gmail.com> |
| `react` | 19.3.1 | MIT | webview | Copyright (c) Meta Platforms, Inc. and affiliates. |
| `react-dom` | 19.3.1 | MIT | webview | Copyright (c) Meta Platforms, Inc. and affiliates. |
| `react-markdown` | 9.1.0 | MIT | webview | Copyright (c) Espen Hovlandsdal |
| `remark-gfm` | 4.0.1 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `remark-parse` | 11.0.0 | MIT | webview | Copyright (c) 2014 Titus Wormer <tituswormer@gmail.com> |
| `remark-rehype` | 11.1.2 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `remark-stringify` | 11.0.0 | MIT | webview | Copyright (c) 2014 Titus Wormer <tituswormer@gmail.com> |
| `scheduler` | 0.28.0 | MIT | webview | Copyright (c) Meta Platforms, Inc. and affiliates. |
| `space-separated-tokens` | 2.0.2 | MIT | webview | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `stringify-entities` | 4.0.4 | MIT | webview | Copyright (c) 2015 Titus Wormer <mailto:tituswormer@gmail.com> |
| `style-to-js` | 1.1.21 | MIT | webview | Copyright (c) 2020 Menglin "Mark" Xu <mark@remarkablemark.org> |
| `style-to-object` | 1.0.14 | MIT | webview | Copyright (c) 2017 Menglin "Mark" Xu <mark@remarkablemark.org> |
| `tailwind-merge` | 2.6.0 | MIT | webview | Copyright (c) 2021 Dany Castillo |
| `trim-lines` | 3.0.1 | MIT | webview | Copyright (c) 2015 Titus Wormer <mailto:tituswormer@gmail.com> |
| `trough` | 2.2.0 | MIT | webview | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `unified` | 11.0.5 | MIT | webview | Copyright (c) 2015 Titus Wormer <tituswormer@gmail.com> |
| `unist-util-is` | 6.0.1 | MIT | webview | Copyright (c) 2015 Titus Wormer <tituswormer@gmail.com> |
| `unist-util-position` | 5.0.0 | MIT | webview | Copyright (c) 2015 Titus Wormer <tituswormer@gmail.com> |
| `unist-util-stringify-position` | 4.0.0 | MIT | webview | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `unist-util-visit` | 5.0.0 | MIT | webview | Copyright (c) 2015 Titus Wormer <tituswormer@gmail.com> |
| `unist-util-visit-parents` | 6.0.2 | MIT | webview | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |
| `use-sync-external-store` | 1.7.0 | MIT | webview | Copyright (c) Meta Platforms, Inc. and affiliates. |
| `vfile` | 6.0.3 | MIT | webview | Copyright (c) 2015 Titus Wormer <tituswormer@gmail.com> |
| `vfile-message` | 4.0.3 | MIT | webview | Copyright (c) Titus Wormer <tituswormer@gmail.com> |
| `yaml` | 2.8.2 | ISC | extension, webview | Copyright Eemeli Aro <eemeli@gmail.com> |
| `zustand` | 4.5.7 | MIT | webview | Copyright (c) 2019 Paul Henschel |
| `zwitch` | 2.0.4 | MIT | webview | Copyright (c) 2016 Titus Wormer <tituswormer@gmail.com> |

## License texts

### MIT License

```text
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### ISC License

```text
Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

### d3-ease (BSD-3-Clause)

```text
Copyright 2010-2026 Mike Bostock
Copyright 2001 Robert Penner
All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of the author nor the names of contributors may be used to
  endorse or promote products derived from this software without specific prior
  written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

---

Generated from `npm ls --omit=dev --all` (extension and `webview-ui/`). Regenerate it when the dependencies change.
