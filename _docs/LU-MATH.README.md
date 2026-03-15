
# lu-math

A (cursed) alternative to MathML.

MathML is an XML-based standard for including mathematical texts, i.e. equations and such, in web pages. However, it's also dreadful. Its bigger flaws include:

* MathML doesn't copy to plaintext properly. If for example you use an `<mfrac>` element to create a vertical fraction, selecting that fraction in a browser and pasting it into Windows Notepad will only copy the visible text-content. No symbols are inserted to indicate that a division is being performed; no parentheses are inserted to separate the numerator and denominator from content around the fraction.

* MathML doesn't properly interoperate with HTML. For example, HTML `<mark>` elements placed within MathML content don't render with the default user-agent styles (i.e. they fail to actually mark/highlight parts of an equation).

These things were dealbreakers for me, so I built an alternative without those issues. Since MathML sucks, and is bad, I figured that even if my alternative also sucks, it'll still be an improvement. My (cursed) combination of custom tagnames and CSS ensures that equations can be properly copied as plain-text (though imperfectly; browsers will insert line breaks all over the place, based on which elements are inline versus block versus inline-block). Additionally, content can be made audible to screen readers without being copyable, and vice versa: we can have something that looks like "<var>x</var><sup>2</sup>", sounds like "x squared," and is copied like `x^2`.

The `asserts/lu-math.scss` file handles styling of lu-math elements. The `_includes/lu-math` folder contains Jekyll/Liquid includes that can be used to produce the appropriate HTML in a more convenient manner.