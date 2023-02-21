
**View this website [here](https://davidjcobb.github.io).**



## Quick reference for maintaining and developing the site

<dl>
   <dt><a href="https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/testing-your-github-pages-site-locally-with-jekyll">Testing the site locally</a></dt>
      <dd>If you've installed Jekyll directly, then open a terminal window in the repo directory and run <code>jekyll serve</code>.</dd>
   <dt><a href="https://jekyllrb.com/docs/">Jekyll docs</a></dt>
      <dd>Basic reference material for Jekyll usage and configuration.</dd>
   <dt><a href="https://shopify.github.io/liquid/">Liquid mini-docs</a></dt>
      <dd>Surface-level reference material for Liquid. Far from comprehensive, but excludes Shopify-specific tags.</dd>
   <dt><a href="https://shopify.dev/docs/api/liquid">Liquid full docs</a></dt>
      <dd>Comprehensive reference material for Liquid and its syntax; however, this includes <em>numerous</em> Shopify-specific tags.</dd>
   <dt><a href="https://github.com/Shopify/liquid-c/tree/4-0-stable">Liquid 4.0 source code</a></dt>
      <dd>Looking at Jekyll's Gemfile, it seems they use the Liquid::C gem, version 4.0. The <a href="https://github.com/Shopify/liquid-c/blob/44da0548992437aa830ab21a0da71d3daf053a94/ext/liquid_c/vm_assembler.c">VM assembler file</a> lists every "standard" Liquid filter; anything not in this list will be Shopify-specific and unsupported.</dd>
   <dt><a href="https://developer.chrome.com/docs/devtools/remote-debugging/local-server/">Accessing desktop localhost on mobile Chromium</a></dt>
      <dd>While testing the site locally, using USB debugging on a mobile device, these instructions can be used to set up port forwarding and allow a Chromium-based mobile browser to access the test site.</dd>
</dl>

The following command can be used when testing locally, to ensure that asset file paths are handled properly:

```
jekyll serve --baseurl /testrepo/
```

You can then access the site at `http://localhost:whatever-port/testrepo/` instead of the usual bare `localhost` URL. Note that this will generate a `testrepo` folder on the file system; make sure you don't accidentally commit that to the repo.