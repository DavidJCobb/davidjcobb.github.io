class YouTubeFacade extends HTMLElement {
   #videoThumbnail(quality) {
      if (!quality)
         quality = "hqdefault";
      return `https://i.ytimg.com/vi/${this.youtubeId}/${quality}.jpg`;
   }
   
   get youtubeId() {
      return this.getAttribute("youtube-id");
   }
   
   #shadow;
   #firstConnect;
   #frame;
   #frameLoaded;
   #fx;
   #image;
   #loadingLink;
   #loadingLinkTimer;
   #logo;
   #pendingThumbs;
   #stylesLoaded;
   #wrap;

   constructor() {
      super();
      this.#firstConnect = true;
      this.#stylesLoaded = false;
      this.#frameLoaded  = false;
      
      let shad = this.#shadow = this.attachShadow({ mode: "closed" });
      {
         let css = document.createElement("link");
         css.setAttribute("rel", "stylesheet");
         css.addEventListener("load", this.#onStylesLoaded.bind(this)); // for preventing FOUC
         css.setAttribute("href", "./facade.css");
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
      node.classList.add("loading");
      node.textContent = "Taking too long to load? Click here.";
      shad.appendChild(node);
      
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
         this.#tryNextThumbnail();
      }
      if (this.#firstConnect || !this.#frame) {
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
   }
}
customElements.define('lu-youtube-facade', YouTubeFacade);