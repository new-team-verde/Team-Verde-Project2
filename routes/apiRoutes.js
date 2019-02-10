var db = require("../models"),
  Sequelize = require("sequelize"),
  authKey = require("../auth/auth_info"),
  passport = require("passport"),
  auth = require("../auth/auth"),
  cookieParser = require("cookie-parser"),
  cookieSession = require("cookie-session");
auth(passport);
module.exports = function(app) {
  app.use(passport.initialize());

  app.use(
    cookieSession({
      name: "session",
      keys: [authKey.encKey],
      maxAge: 24 * 60 * 60 * 1000
    })
  );
  app.use(cookieParser());
  app.get("/", (req, res) => {
    if (req.session.token) {
      res.cookie("token", req.session.token);
      res.render("home");
    } else {
      res.cookie("token", "");
      res.render("signin");
    }
  });

  app.get("/logout", (req, res) => {
    req.logout();
    req.session = null;
    res.redirect("/");
  });

  app.get(
    "/auth/google",
    passport.authenticate("google", {
      scope: ["https://www.googleapis.com/auth/userinfo.profile"]
    })
  );

  app.get(
    "/auth/google/callback",
    passport.authenticate("google", {
      failureRedirect: "/"
    }),
    (req, res) => {
      req.session.token = req.user.token;
      res.redirect(
        "/home/" +
          req.user.profile.id +
          "/" +
          req.user.profile.name.givenName +
          req.user.profile.name.familyName
      );
    }
  );
  app.get("/home/:id/:name", (req, res) => {
    let userId = req.params.id;
    let name = req.params.name;
    db.Post.findAll({
      order: [["vote", "DESC"]]
    }).then(result => {
      res.render("home", {
        posts: result,
        userId: userId,
        thisUserName: name
      });
    });
  });

  app.get("/home/:id", (req, res) => {
    let userId = req.params.id;
    db.Post.findAll({
      order: [["vote", "DESC"]]
    }).then(result => {
      res.render("home", {
        posts: result,
        thisUserId: userId
      });
    });
  });
  app.get("/submit/:id/:author", (req, res) => {
    let userId = req.params.id;
    let name = req.params.author;
    res.render("submit", { userId: userId, thisUserName: name });
  });
  app.post("/api/posts/:id/:name", function(req, res) {
    db.Post.create(req.body).then(function(dbPost) {
      res.render("home", {
        posts: dbPost,
        thisUserId: req.params.id,
        thisUserName: req.params.name
      });
    });
  });
  app.get("/contact/:id/:author", (req, res) => {
    let userId = req.params.id;
    let name = req.params.author;
    res.render("contact", { userId: userId, thisUserName: name });
  });
  app.get("/api/increment/:id", function(req, res) {
    db.Post.update(
      { vote: Sequelize.literal("vote + 1") },
      { where: { id: req.params.id } }
    ).then(() => {
      res.status(200).end();
    });
  });
  app.get("/api/decrement/:id", function(req, res) {
    db.Post.update(
      { vote: Sequelize.literal("vote - 1") },
      { where: { id: req.params.id } }
    ).then(() => {
      res.status(200).end();
    });
  });
  app.post("/api/like/", (req, res) => {
    let postId = req.body.postId;
    let userId = req.body.userId;
    db.Likes.findOne({
      where: {
        userId: userId,
        postId: postId
      }
    })
      .then(result => {
        if (!result.isLiked && !result.disLiked) {
          res.redirect("/api/like/" + result.id);
        } else if (result.isLiked) {
          db.Likes.update(
            {
              isLiked: false,
              disLiked: false
            },
            {
              where: {
                userId: userId,
                postId: postId
              }
            }
          ).then(() => {
            res.redirect("/api/decrement/" + postId);
          });
        } else if (result.disLiked) {
          db.Likes.update(
            {
              isLiked: false,
              disLiked: false
            },
            {
              where: {
                userId: userId,
                postId: postId
              }
            }
          ).then(() => {
            res.redirect("/api/increment/" + postId);
          });
        }
      })
      .catch(() => {
        db.Likes.create(req.body).then(() => {
          res.redirect("/api/increment/" + postId);
        });
      });
  });
  app.post("/api/dislike/", (req, res) => {
    let postId = req.body.postId;
    let userId = req.body.userId;
    db.Likes.findOne({
      where: {
        userId: userId,
        postId: postId
      }
    })
      .then(result => {
        if (!result.isLiked && !result.disLiked) {
          res.redirect("/api/dislikes/" + result.id);
        } else if (result.isLiked) {
          db.Likes.update(
            {
              isLiked: false,
              disLiked: false
            },
            {
              where: {
                userId: userId,
                postId: postId
              }
            }
          ).then(() => {
            res.redirect("/api/decrement/" + postId);
          });
        } else if (result.disLiked) {
          db.Likes.update(
            {
              isLiked: false,
              disLiked: false
            },
            {
              where: {
                userId: userId,
                postId: postId
              }
            }
          ).then(() => {
            res.redirect("/api/increment/" + postId);
          });
        }
      })
      .catch(() => {
        db.Likes.create(req.body).then(() => {
          res.redirect("/api/decrement/" + postId);
        });
      });
  });
  app.get("/api/like/:id", (req, res) => {
    let id = req.params.id;
    db.Likes.update(
      { isLiked: true, disLiked: false },
      {
        where: {
          id: id
        }
      }
    ).then(() => {
      db.Likes.findById(id).then(data => {
        console.log("like " + data.postId);
        res.redirect("/api/increment/" + data.postId);
      });
    });
  });
  app.get("/api/dislikes/:id", (req, res) => {
    let id = req.params.id;
    db.Likes.update(
      { isLiked: false, disLiked: true },
      {
        where: {
          id: id
        }
      }
    ).then(() => {
      db.Likes.findById(id).then(data => {

        console.log("dislike " + data.postId);
        res.redirect("/api/decrement/" + data.postId);
      });
    });
  });
  app.get("/api/likedby/:id", (req, res) => {
    db.Likes.findAll({
      where: {
        userId: req.params.id
      }
    }).then(result => {
      res.json(result);
    });
  });
};
