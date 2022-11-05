
# Detecting smartphones

There's no good media query for detecting smartphones, so as of this writing, this 
site currently uses the following query to target smartphones in portrait orientation:

```css
@media only screen and (hover: none) and (max-aspect-ratio:3/5) {
```

The `max-aspect-ratio` query ensures that we only target devices in portrait 
orientation. We use `only screen and (hover: none)` to detect devices that have 
screens but not mice.

The goal of this detection is to increase text sizes to comfortable values, and to 
disable floating and width limits on the `aside`s so that they're large enough to 
be easily legible.

## Alternatives that don't work

The `handheld` device type is deprecated, and current standards require that it match 
no device.

Not all touch-capable devices are smartphones; tablets and even many laptops have 
touch-capable screens, so testing for touch-capable devices is not sufficient. The 
nearest analogue is to test for devices that are hover-*in*capable despite having 
screens. Remember that the goal is to make the site easily readable and operable 
on smartphones in specific -- high-resolution, small-size touch-only devices.

## Why is there no good media query?

### Browsers lie about DPI

The CSS standard definition of a "pixel" is somewhat counterintuivie &mdash; a 
pile-up of historical compromises and assumptions that has produced a result which 
is... suboptimal. The standard mandates fixed relationships between all length 
units, physical and digital, and assumes a DPI of 96 in order to allow this; ergo 
`96px` is equivalent to `1in`. Devices which support CSS are allowed to implement 
these fixed relationships in one of two ways, choosing at their discretion:

* Map `1px` to a single device pixel, thereby making all physical units (e.g. `1in`) 
  inaccurate for DPIs other than 96. This implies a need for the device to lie 
  to pages and JavaScript about the DPI, screen size, and similar, in order to 
  maintain the 96 DPI conversion factor.

* Map `1px` to one ninety-sixth of an inch, thereby making the basic pixel unit 
  inaccurate on devices with DPIs other than 96.

The term for this is "anchoring:" you anchor either the physical units to the 
digital, or the digital to the physical. The standard encourages screen devices 
to make the former choice, and print media to make the latter choice. (Web pages 
can be printed out, remember?) However, browsers *can* choose at their discretion.

### Meta viewport is counterintuitive and unreliable

Let's look at the implementation of `meta viewport` just on Google Chrome. When 
you use `device-width` and `device-height`, Chrome takes the device pixel resolution 
and converts it to 160 DPI, to get a result measured in `dip`, an Android-specific 
unit called "density-independent pixels." They then shear off the unit, take these 
numbers as CSS pixel quantities, and use that as the viewport size.

Let's use an example from [the developer documentation](https://chromium.googlesource.com/chromium/src/+/HEAD/android_webview/docs/web-page-layout.md).

* We start with the device pixel resolution. This may optionally exclude regions of 
  the screen reserved for use by OS-level UI, such as a tablet or phone's status bar 
  and bottom action bar. For the example here, we're using the 2012-era Nexus 7; it 
  has a device pixel resolution of 800x1280px, but Google here lists it as 800x1205px.
  
* We next need the screen's "density." Google does not here specify what that means, 
  but looking at the Android API, they're referring to [the `DisplayMetrics.density` 
  value](https://developer.android.com/reference/android/util/DisplayMetrics#density). 
  This value is used as the scaling factor for the `dip` unit: divide the device 
  pixel resolution by this value to get the resolution in `dip`s.
  
  Per the documentation, `dip`s assume a resolution of 160 DPI; on such a screen, the 
  `density` is `1.0`. Google states that the Nexus 7 has a density of `1.33`; if you 
  multiply `160 * 1.33`, the result is `212.8`, which is the approximate DPI of the 
  Nexus 7 given a device pixel resolution of 800x1205 and a diagonal of 6.8 inches 
  (the real diagonal is 7 inches, but remember: Google is excluding parts of the 
  screen from these measurements).
  
* Dividing the device pixel resolution by the density value, we get the screen's 
  size in density-independent "pixels:" 600x900dips. Shear off the unit, and these 
  are used as the `device-width` and `device-height`.

This in turn means that contrary to what one would reasonably expect given their 
names, `device-width` and `device-height` are *not* the device pixel resolution &mdash; 
the true physical resolution of the *device* &mdash; but rather are the same kind of 
abstraction as CSS pixels, but with a different chosen DPI. At least in this case, the 
abstracted size is vaguely connected to the device pixel resolution; however, the 
difference in assumed DPIs (between `meta viewport` and CSS itself) adds another 
hurdle to jump over.

In summary:

* On platforms where `meta viewport` is used (including platforms which use `meta viewport` 
  behavior with some default value, e.g. 980px, when the tag is omitted), the `width` 
  option controls how many CSS pixels map to `100vw`. By implication, `1px` on these 
  platforms *does not* map to a device pixel.

* On Google Chrome, at the very least, setting `width=device-width` means that 
  `160px` is equivalent to one inch. This *is* a violation of the CSS spec, but it at 
  least keeps to the *spirit* of the spec, anchoring digital units to physical ones as 
  would be done for print media. It's just the choice of DPI that is non-compliant.

* Setting `width` to any other value means that there is no longer any mapping between 
  any CSS unit and any real-world unit; the measurement system becomes completely 
  unmoored from reality. This is a violation of the CSS spec; it is also the default 
  behavior in pretty much every mobile browser (given that again, the default viewport 
  width is typically 960 or 980 rather than `device-width`).

That middle bullet point almost sounds like something you can use, though you'd only be 
able to size things in inches and not in device pixels. The problem is that there's no 
way to test, from CSS alone, whether `meta viewport` is actually in use. There are 
[JavaScript hacks](https://stackoverflow.com/questions/16758978/detect-support-for-meta-viewport-scaling/23708819#23708819) 
to do it, but redoing all of your element sizes, throughout your stylesheet, in inches 
based on *JavaScript* strikes me as a bad idea.

As a side note: Mozilla Developer Network's [current documentation for `meta viewport`](https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag) 
is completely wrong as of this writing. They describe `device-width` and 
`device-height` as being equivalent to `100vw` and `100vh`, which is incorrect: the 
purpose of the `width` and `height` values is to control *what `100vw` and `100vh` 
are*, so *any value you use* is `100vw` and `100vh` and any value you *don't* use 
*isn't.* If you use a number that isn't what `device-width` would've computed to, 
then `device-width` *is not* `100vw`. Stating that `device-width` is `100vw` is 
wrong in most cases, and when it *isn't* wrong, it's completely uninformative.


