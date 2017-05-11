# Sea Containers

## What it does

Opens a sidebar to manage containers

![Sidebar managing containers](preview.png)

# Installing

- Requires Firefox 54 (currently in Beta)
  - [Download Beta](https://www.mozilla.org/en-US/firefox/beta/all/)
  - [Download Nightly Firefox](https://www.mozilla.org/en-US/firefox/nightly/all/)
- Requires [containers enabled](https://testpilot.firefox.com/experiments/containers)
- Go to about:debugging
- Load Temporary Addon
- Click the manifest file in this directory
- As this is a debugging extension, it wont last after a restart.
  - This is currently going through review process to be installable through addons.mozilla.org

# TODO

- Prevent tab click from changing scroll position
- Performance issues, this was hacked together to prove it is possible
- Alignment issues
- Look into why some favicons don't load

- Fix in test pilot broken colour and icons

# Demo as sidebar only

Firefox lets users override 'chrome' level styles. Add a chrome directory and create a `chrome/userChrome.css` file with the following contents:

```
@namespace url("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul");
#TabsToolbar {
  visibility: collapse;
}
```

When firefox is reloaded you won't have any horizontal tabs.


# Credits

- https://thenounproject.com/search/?q=container&i=715166
