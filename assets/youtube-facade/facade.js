let YouTubeFacade = (function() {
   let base_path = document.currentScript.getAttribute("data-asset-folder");
   if (!base_path.endsWith('/'))
      base_path += '/';
   
   (async function() {
      let css = document.createElement("link");
      css.setAttribute("rel", "stylesheet");
      css.setAttribute("href", `${base_path}facade-non-shadow.css`);
      document.querySelector("head").appendChild(css);
   })();
   
   /*
      Some configuration options are kept synchronized between JS properties 
      and DOM attributes, preferring the properties for speed. We accomplish 
      this through a few techniques:
      
       - Attr, a helper class for tracking when properties change
       
       - YouTubeFacade.#attrs, an instance collection of Attrs
       
       - YouTubeFacade._leakAttr,  a function  which we steal  and delete in 
         order to gain access to  #attrs; we use this  to dynamically define 
         [gs]etters for the properties in question.
      
      The ATTRIBUTES map associates DOM attribute and JS property names.
   */
   
   class Attr {
      value = void 0;
      last  = void 0;
      sync  = false;
      constructor(owner, attr, onchange) {
         this.attr     = attr;
         this.owner    = owner;
         this.onchange = onchange || null;
      }
      init() {
         this.value = this.owner.getAttribute(this.attr);
      }
      update(v) {
         if (this.sync)
            return;
         this.value = v;
         if (this.last != v) {
            this.sync = true;
            this.owner.setAttribute(this.attr, v);
            if (this.onchange)
               (this.onchange).call(this.owner, v);
            this.sync = false;
            this.last = v;
         }
      }
   };
   
   const ATTRIBUTES = [
      { attr: "youtube-channel-image-src", prop: "youtubeChannelImageSrc" },
      { attr: "youtube-channel-url",       prop: "youtubeChannelUrl" },
      { attr: "youtube-title",             prop: "youtubeVideoTitle" },
   ];
   const ATTR_LIST = ATTRIBUTES.map(e => e.attr);
   
   class YouTubeFacade extends HTMLElement {
      static #html = (function() {
         let node = document.createElement("template");
         node.innerHTML = `
<div>
   <img class="thumb" />
   <button class="logo" aria-label="Play"></button>
   <div class="fx"></div>
   <a class="load-fallback">Taking too long to load? Click here.</a>
   <a class="impression" target="_blank" aria-label="Watch on YouTube">Watch on <img src="${base_path}youtube-logo.svg" /></a>
   <header>
      <a target="_blank" class="channel"><img /></a>
      <a target="_blank" class="title" tabindex="0"></a>
   </header>
</div>
         `.trim();
         return node.content;
      })();
      
      #videoThumbnail(quality) {
         if (!quality)
            quality = "hqdefault";
         return `https://i.ytimg.com/vi/${this.youtubeId}/${quality}.jpg`;
      }
      
      static get observedAttributes() {
         return ATTR_LIST;
      }
      attributeChangedCallback(name, oldValue, newValue) {
         this.#attrs[ATTRIBUTES.find(e => e.attr == name).prop].update(newValue);
      }
      
      get youtubeId() {
         return this.getAttribute("youtube-id");
      }
      
      // attr change handlers
      #onChannelUrlChanged(v)      { this.#channelLink.href = v;           this.#onVideoHeaderChanged(); }
      #onChannelImageSrcChanged(v) { this.#channelImage.src = v;           this.#onVideoHeaderChanged(); }
      #onVideoTitleChanged(v)      { this.#videoTitleNode.textContent = v; this.#onVideoHeaderChanged(); }
      //
      #onVideoHeaderChanged() {
         let show = (this.youtubeChannelUrl && this.youtubeChannelImageSrc && this.youtubeVideoTitle);
         this.#header.classList[show ? "add" : "remove"]("show");
      }
      
      // state
      #attrs = {
         youtubeChannelUrl:      new Attr(this, "youtube-channel-url",       this.#onChannelUrlChanged),
         youtubeChannelImageSrc: new Attr(this, "youtube-channel-image-src", this.#onChannelImageSrcChanged),
         youtubeVideoTitle:      new Attr(this, "youtube-title",             this.#onVideoTitleChanged),
      };
      #firstConnect = true;
      #frameLoaded  = false;
      #stylesLoaded = false;
      
      // nodes
      #shadow;
      #channelLink;
      #channelImage;
      #header;
      #frame;
      #fx;
      #image;
      #impressionLink;
      #loadingLink;
      #loadingLinkTimer;
      #logo;
      #pendingThumbs;
      #videoTitleNode;
      #wrap;
      
      constructor() {
         super();
         
         let shad = this.#shadow = this.attachShadow({ mode: "closed" });
         {
            let css = document.createElement("link");
            css.setAttribute("rel", "stylesheet");
            css.addEventListener("load", this.#onStylesLoaded.bind(this)); // for preventing FOUC
            css.setAttribute("href", `${base_path}facade.css`);
            this.#shadow.appendChild(css);
         }
         
         shad.appendChild(YouTubeFacade.#html.cloneNode(true));
         
         this.#wrap = shad.querySelector("div");
         
         let node;
         
         node = this.#image = shad.querySelector(".thumb");
         node.addEventListener("error", this.#tryNextThumbnail.bind(this));
         node.addEventListener("load", this.#onThumbnailLoaded.bind(this));
         node.width = node.height = 2; // Chrome: first-frame size fix: prevent it from briefly displaying at full size and overflowing for one frame
         
         this.#logo = shad.querySelector(".logo");
         this.#fx   = shad.querySelector(".fx");
         this.#loadingLink    = shad.querySelector(".load-fallback");
         this.#impressionLink = shad.querySelector(".impression");
         
         node = this.#header = shad.querySelector("header");
         this.#videoTitleNode = node.querySelector(".title");
         node = this.#channelLink = node.querySelector(".channel");
         this.#channelImage = node.querySelector("img");
         
         this.#pendingThumbs = [ // thumbnail types to try, in order
            //"maxresdefault", // 1280px
            "sddefault", // 640px
            "hqdefault", // 480px
            "mqdefault", // 320px
            "default",   // 120px
         ];
         
         this.addEventListener("click", this.#onClicked.bind(this));
      }
      
      #onStylesLoaded() { // for preventing FOUC
         this.#stylesLoaded = true;
         this.style.visibility = "";
      }
      #onThumbnailLoaded() {
         //
         // YouTube returns a 404 response for missing thumbs, but attached to that 
         // response is a 120x90px placeholder image, so the browser doesn't fire 
         // onerror for it. Of course, that's also the smallest thumbnail size...
         //
         let img = this.#image;
         if (img.naturalWidth == 120 && image.naturalHeight == 90) {
            this.#tryNextThumbnail();
            return;
         }
      }
      #tryNextThumbnail() {
         if (this.#pendingThumbs.length == 0)
            return;
         this.#image.src = this.#videoThumbnail(this.#pendingThumbs.shift());
      }
      
      #stealNoscript() {
         //
         // If this element is placed directly after a NOSCRIPT tag, it will try to 
         // steal an IFRAME from that tag, assuming that said IFRAME is a YouTube 
         // embed for users with scripts disabled for this site. (If this fails, the 
         // element will create its own IFRAME from scratch.)
         //
         let noscript = this.previousElementSibling;
         if (!noscript || noscript.nodeName != "NOSCRIPT")
            return;
         let node;
         {
            let frag = document.createElement("template");
            frag.innerHTML = noscript.innerHTML.trim();
            node = frag.content.querySelector("iframe");
         }
         if (!node)
            return;
         this.#frame = node;
         let url = new URL(node.getAttribute("src"));
         ["autoplay","playsinline"].forEach(e => url.searchParams.set(e, "1"));
         node.setAttribute("src", url.href);
         node.setAttribute("loading", "eager");
         //
         noscript.remove();
         //
         // Copy presentational and semantic attributes from the IFRAME:
         //
         for(const attr of ["width", "height"]) {
            let v = this.getAttribute(attr);
            if (v === null || isNaN(v = +v)) {
               v = node.getAttribute(attr);
               if (v === null || isNaN(v = +v))
                  continue;
            }
            this.style[attr] = v + "px";
         }
         for(const attr of ["alt", "aria-label", "aria-description", "aria-labelledby", "aria-describedby"]) {
            if (node.hasAttribute(attr)) {
               this.setAttribute(attr, node.getAttribute(attr));
               node.removeAttribute(attr);
            }
         }
      }
      
      #onFrameLoaded(e) {
         this.#loadingLinkTimer = window.clearTimeout(this.#loadingLinkTimer);
         this.#loadingLink.classList.remove("show");
      }
      #showLoadingLink() {
         this.#loadingLink.classList.add("show");
      }
      #onClicked() {
         if (this.#frame) {
            this.#wrap.classList.add("activated");
            this.#logo.remove();
            if (!this.#frameLoaded) {
               ["load", "error"].forEach(e => this.#frame.addEventListener(e, this.#onFrameLoaded.bind(this)));
            }
            this.#shadow.appendChild(this.#frame);
            this.#loadingLinkTimer = window.setTimeout(this.#showLoadingLink.bind(this), 1000);
         }
      }
      
      connectedCallback() {
         if (this.#firstConnect) {
            if (!this.#stylesLoaded) {
               this.style.visibility = "hidden"; // prevent FOUC
            }
            this.#firstConnect = false;
            //
            for(let a of Object.values(this.#attrs))
               a.init();
            this.#onVideoHeaderChanged();
            //
            this.#tryNextThumbnail();
         }
         if (!this.#frame) {
            this.#stealNoscript();
            if (!this.#frame) {
               let node = this.#frame = document.createElement("iframe");
               node.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture");
               node.setAttribute("allowfullscreen", "");
               node.setAttribute("src", `https://www.youtube.com/embed/${this.youtubeId}?autoplay=1&playsinline=1`);
               node.setAttribute("frameborder", 0);
            }
         }
         this.#image.width = this.#image.height = ""; // part of Chrome first-frame size fix above
         let video_url = `https://www.youtube.com/watch?v=${this.youtubeId}`;
         this.#loadingLink.setAttribute("href", video_url);
         this.#videoTitleNode.setAttribute("href", video_url);
         {
            let referrer = encodeURIComponent(window.location.hostname + '/');
            this.#impressionLink.setAttribute("href", `${video_url}&embeds_euri=${referrer}&feature=emb_imp_woyt`);
         }
      }
      
      _leakAttr(name) { // see below
         return this.#attrs[name];
      }
   }
   {
      let proto = YouTubeFacade.prototype;
      let leak  = proto._leakAttr;
      delete proto._leakAttr;
      let props = {};
      for(let e of ATTRIBUTES) {
         let name = e.prop;
         props[name] = {
            get() {
               return leak.call(this, name).value;
            },
            set(v) {
               leak.call(this, name).update(v);
            }
         };
      }
      Object.defineProperties(proto, props);
   }
   customElements.define('lu-youtube-facade', YouTubeFacade);
   return YouTubeFacade;
})();