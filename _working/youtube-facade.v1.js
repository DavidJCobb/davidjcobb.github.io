(async function() {
   let css = document.createElement("link");
   css.setAttribute("rel", "stylesheet");
   css.setAttribute("href", "/assets/youtube-facade/facade-non-shadow.css");
   document.querySelector("head").appendChild(css);
})();

class YouTubeFacade extends HTMLElement {
   #videoThumbnail(quality) {
      if (!quality)
         quality = "hqdefault";
      return `https://i.ytimg.com/vi/${this.youtubeId}/${quality}.jpg`;
   }
   
   static get observedAttributes() {
      return ["youtube-channel-image-src", "youtube-channel-url", "youtube-title"];
   }
   attributeChangedCallback(name, oldValue, newValue) {
      if (this.#synchronizingAttributes[name] > 0)
         return;
      switch (name) {
         case "youtube-channel-image-src":
            this.youtubeChannelImageSrc = newValue;
            break;
         case "youtube-channel-url":
            this.youtubeChannelUrl = newValue;
            break;
         case "youtube-title":
            this.youtubeVideoTitle = newValue;
            break;
      }
   }
   
   // For JS properties meant to synchronize with attributes, have the JS 
   // property setters use this instead of setAttribute to avoid infinite 
   // recursion.
   #synchronizingAttributes = {};
   #synchronizeAttribute(name, value) {
      let set = this.#synchronizingAttributes;
      if (!set[name])
         set[name] = 0;
      ++set[name];
      this.setAttribute(name, value);
      if (--set[name] == 0)
         delete set[name];
   }
   //
   // Synchronized attributes/properties:
   //
   #channelUrl;
   #channelImageSrc;
   #videoTitle;

   get youtubeChannelUrl() {
      return this.#channelUrl;
   }
   set youtubeChannelUrl(v) {
      this.#channelUrl = v;
      this.#synchronizeAttribute("youtube-channel-url", v);
      this.#onVideoHeaderChanged();
   }
   
   get youtubeChannelImageSrc() {
      return this.#channelImageSrc;
   }
   set youtubeChannelImageSrc(v) {
      this.#channelImageSrc = v;
      this.#synchronizeAttribute("youtube-channel-image-src", v);
      this.#onVideoHeaderChanged();
   }
   
   get youtubeVideoTitle() {
      return this.#videoTitle;
   }
   set youtubeVideoTitle(v) {
      this.#channelImageSrc = v;
      this.#synchronizeAttribute("youtube-title", v);
      this.#onVideoHeaderChanged();
   }
   
   get youtubeId() {
      return this.getAttribute("youtube-id");
   }
   
   #shadow;
   #channelLink;
   #channelImage;
   #header;
   #firstConnect = true;
   #frame;
   #frameLoaded = false;
   #fx;
   #image;
   #impressionLink;
   #loadingLink;
   #loadingLinkTimer;
   #logo;
   #pendingThumbs;
   #stylesLoaded = false;
   #videoTitleNode;
   #wrap;

   constructor() {
      super();
      
      let shad = this.#shadow = this.attachShadow({ mode: "closed" });
      {
         let css = document.createElement("link");
         css.setAttribute("rel", "stylesheet");
         css.addEventListener("load", this.#onStylesLoaded.bind(this)); // for preventing FOUC
         css.setAttribute("href", "/assets/youtube-facade/facade.css");
         this.#shadow.appendChild(css);
      }
      let node;
      let wrap = this.#wrap = document.createElement("div");
      shad.appendChild(wrap);
      
      node = this.#image = document.createElement("img");
      node.classList.add("thumb");
      node.addEventListener("error", this.#tryNextThumbnail.bind(this));
      node.addEventListener("load", this.#onThumbnailLoaded.bind(this));
      node.width = node.height = 2; // Chrome: first-frame size fix: prevent it from briefly displaying at full size and overflowing for one frame
      wrap.appendChild(node);
      
      node = this.#logo = document.createElement("button");
      node.classList.add("logo");
      node.setAttribute("aria-label", "Play");
      wrap.appendChild(node);
      
      node = this.#fx = document.createElement("div");
      node.classList.add("fx");
      wrap.appendChild(node);
      
      node = this.#loadingLink = document.createElement("a");
      node.classList.add("load-fallback");
      node.textContent = "Taking too long to load? Click here.";
      shad.appendChild(node);
      
      node = this.#impressionLink = document.createElement("a");
      node.classList.add("impression");
      node.setAttribute("target", "_blank");
      node.setAttribute("aria-label", "Watch on YouTube");
      node.textContent = "Watch on";
      {
         let svg = document.createElement("img");
         svg.setAttribute("src", "/assets/youtube-facade/youtube-logo.svg");
         node.append(svg);
      }
      wrap.appendChild(node);
      
      let head = this.#header = document.createElement("header");
      wrap.append(head);
      node = this.#channelLink = document.createElement("a");
      node.classList.add("channel");
      node.setAttribute("target", "_blank");
      head.append(node);
      {
         let img = this.#channelImage = document.createElement("img");
         node.append(img);
      }
      //
      node = this.#videoTitleNode = document.createElement("a");
      node.classList.add("title");
      node.setAttribute("target", "_blank");
      node.setAttribute("tabindex", "0");
      head.append(node);
      
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
   
   #lastRenderedChannelUrl;
   #lastRenderedChannelImageSrc;
   #lastRenderedVideoTitle;
   //
   #onVideoHeaderChanged() {
      let changed = false;
      if (this.#channelUrl != this.#lastRenderedChannelUrl) {
         changed = true;
         this.#channelLink.setAttribute("href", this.#channelUrl);
         this.#lastRenderedChannelUrl = this.#channelUrl;
      }
      if (this.#channelImageSrc != this.#lastRenderedChannelImageSrc) {
         changed = true;
         this.#channelImage.setAttribute("src", this.#channelImageSrc);
         this.#lastRenderedChannelImageSrc = this.#channelImageSrc;
      }
      if (this.#videoTitle != this.#lastRenderedVideoTitle) {
         changed = true;
         this.#videoTitleNode.textContent = this.#videoTitle;
         this.#lastRenderedVideoTitle = this.#videoTitle;
      }
      
      if (changed) {
         let show = (this.#channelUrl && this.#channelImageSrc && this.#videoTitle);
         this.#header.classList[show ? "add" : "remove"]("show");
      }
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
         this.#channelUrl      = this.getAttribute("youtube-channel-url");
         this.#channelImageSrc = this.getAttribute("youtube-channel-image-src");
         this.#videoTitle      = this.getAttribute("youtube-title");
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
      this.#loadingLink.setAttribute("href", `https://www.youtube.com/watch?v=${this.youtubeId}`);
      {
         let referrer = encodeURIComponent(window.location.hostname + '/');
         this.#impressionLink.setAttribute("href", `https://www.youtube.com/watch?v=${this.youtubeId}&embeds_euri=${referrer}&feature=emb_imp_woyt`);
      }
   }
}
customElements.define('lu-youtube-facade', YouTubeFacade);