
**View this website [here](https://davidjcobb.github.io).**



## Quick reference for maintaining and developing the site

<dl>
   <dt>[Testing the site locally](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/testing-your-github-pages-site-locally-with-jekyll)</dt>
      <dd>If you've installed Jekyll directly, then open a terminal window in the repo directory and run <code>jekyll serve</code>.</dd>
   <dt>[Jekyll docs](https://jekyllrb.com/docs/)</dt>
      <dd>Basic reference material for Jekyll usage and configuration.</dd>
   <dt>[Liquid mini-docs](https://shopify.github.io/liquid/)</dt>
      <dd>Surface-level reference material for Liquid. Far from comprehensive, but excludes Shopify-specific tags.</dd>
   <dt>[Liquid full docs](https://shopify.dev/docs/api/liquid)</dt>
      <dd>Comprehensive reference material for Liquid and its syntax; however, this includes <em>numerous</em> Shopify-specific tags.</dd>
   <dt>[Liquid 4.0 source code](https://github.com/Shopify/liquid-c/tree/4-0-stable)</dt>
      <dd>Looking at Jekyll's Gemfile, it seems they use the Liquid::C gem, version 4.0. The [VM assembler file](https://github.com/Shopify/liquid-c/blob/44da0548992437aa830ab21a0da71d3daf053a94/ext/liquid_c/vm_assembler.c) lists every "standard" Liquid filter; anything not in this list will be Shopify-specific and unsupported.</dd>
   <dt>[Accessing desktop localhost on mobile Chromium](https://developer.chrome.com/docs/devtools/remote-debugging/local-server/)</dt>
      <dd>While testing the site locally, using USB debugging on a mobile device, these instructions can be used to set up port forwarding and allow a Chromium-based mobile browser to access the test site.</dd>
</dl>

The following command can be used when testing locally, to ensure that asset file paths are handled properly:

```
jekyll serve --baseurl /testrepo/
```

You can then access the site at `http://localhost:whatever-port/testrepo/` instead of the usual bare `localhost` URL.