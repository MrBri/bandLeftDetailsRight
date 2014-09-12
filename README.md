bandLeftDetailsRight
====================

![](http://g.recordit.co/4JkJXIndzA.gif)

**Deployed! [http://band-left-details-right.herokuapp.com/](http://band-left-details-right.herokuapp.com/)**   
*May have to wait a minute for free dyno to fire up*

#### Requirements
- [Node.js](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager) v0.10.30 or newer
- [redis](http://redis.io/download) `brew install redis`

#### To run locally
1. `git clone git@github.com:MrBri/bandLeftDetailsRight.git`
2. `npm install`
3. Make sure redis is running. In a seperate terminal window `redis-server`
4. `gulp` or `npm start`
5. navigate to [http://localhost:5000](http://localhost:5000)

#### Approach
First got things working by using bootstrap's javascript tabs but that was basically a single page app then refactored ejs to partials and hapi's layout option.

Next using HTML5's contenteditable to allow inline editing on band details POSTing to server

Redis's key/value and data structures

#### Missing
- user auth
- validation
- add/del members
