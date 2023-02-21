
# YouTube facade

A custom-made custom element serving as a facade for YouTube embeds: it imitates an embedded video, but only 
actually loads a real YouTube IFRAME once the user interacts. Said IFRAME is set to autoplay, so the user only 
has to click once to play the video, as normal.

## Usage

The tagname is `lu-youtube-facade`. Attributes are:

<dl>
   <dt>youtube-id</dt>
      <dd>Required: The ID of the YouTube video to embed.</dd>
   <dt>youtube-title</dt>
      <dd>Optional: Title of the YouTube video. Used to fake displaying the channel icon and video title.</dd>
   <dt>youtube-channel-url</dt>
      <dd>Optional: The URL of the channel that uploaded the video. Used to fake displaying the channel icon 
      and video title.</dd>
   <dt>youtube-channel-image-src</dt>
      <dd>Optional: The URL of the channel's profile picture (or any suitable equivalent). Used to fake 
      displaying the channel icon and video title.</dd>
</dl>

### Required resources

In order to load YouTube embeds' custom fonts, you must include a stylesheet in the containing document 
that supplies the Roboto typeface in weights 400 (normal) and 500. Chromium [does not support `@font-face` 
CSS rules in stylesheets stored in shadow roots](https://bugs.chromium.org/p/chromium/issues/detail?id=336876).

### Noscript previous sibling

If you place the element immediately after a `<noscript />` tag, then the element will check whether that 
tag contains an `<iframe />`. If so, it will assume that that frame is a YouTube embed &mdash; a fallback 
for user agents that have scripts disabled either on your site or generally &mdash; and will copy the frame 
from that embed. The copied frame will be displayed when the user interacts. The following attributes are 
also copied from the frame onto the custom element:

* width (copied to inline CSS)
* height (copied to inline CSS)
* alt
* aria-label
* aria-labelledby
* aria-description
* aria-describedby

If the element is *not* placed after a `<noscript />` tag containing an `<iframe />` tag, then the element 
will construct its own `<iframe />`.

The benefit of reusing an iframe in a `<noscript />` tag is that you can provide ARIA attributes and other 
semantic information on the fallback element, and the script can just copy that, saving you the need to 
bloat your markup with duplicated content.

## Other features

YouTube supplies video thumbnails in several resolutions, but not all resolutions are available for all 
videos. This facade will attempt to load thumbnails starting with the 640px-resolution image and working 
its way downward to the minimum 120px resolution, stopping at and using the first image that works.

This facade mimics the "Watch on YouTube" button and, optionally, the channel icon and video title.

## Under the hood

The `youtubeChannelImageSrc`, `youtubeChannelUrl`, and `youtubeVideoTitle` properties on the element will 
synchronize with the relevant attributes. This synchronization is accomplished using three parts:
  
* A private `Attr` class keeps track of properties' values on the JS side, and of whether they've been 
  synchronized over to the DOM attributes. It also supports running a single `onchange` handler, which is 
  invoked with the owning `YouTubeFacade` instance as `this` and the new value as an argument.

* A private `ATTRIBUTES` variable maps DOM attribute names to JS property names.

* On `YouTubeFacade` instances, the `#attrs` map stores `Attr` instances.

* `YouTubeFacade` defines an instance method called `_leakAttr`, which leaks any `Attr` from `#attrs` by 
  name. Immediately after the class definition, in an anonymous function, we "steal" this method &mdash; 
  we copy it for ourselves, delete it off the `YouTubeFacade` prototype, and use it to create closure-based 
  getters and setters for all of the JS properties. Ultimately, `_leakAttr` is never accessible to outside 
  code.

## Attributions

The YouTube icons were pulled from YouTube's [Brand Resources and Guidelines](https://www.youtube.com/howyoutubeworks/resources/brand-resources/#logos-icons-and-colors). You can find 
vector graphics there in `*.ai` format; I ran them through an online (Inkscape-based?) converter to `*.svg` 
and then removed cruft and unnecessary groupings mostly by hand.