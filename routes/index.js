var express = require("express");
var router = express.Router();
const bcrypt = require("bcrypt");
const saltRounds = 10;
const path = require("path");
const { isLoggedIn } = require("../helpers/util");

//  GET home page
module.exports = function (db) {
  router.get("/", function (req, res, next) {
    res.render("partials/login", { failedInfo: req.flash("failedInfo"), successInfo: req.flash("successInfo") });
  });

  router.post("/", async function (req, res) {
    try {
      const { email, password } = req.body;
      const { rows: users } = await db.query("SELECT * FROM public.users WHERE email = $1", [email]);

      if (users.length == 0) {
        req.flash("failedInfo", `Email doesn't exist`);
        return res.redirect("/");
      } else {
        if (!bcrypt.compareSync(password, users[0].password)) {
          req.flash("failedInfo", "Password is wrong");
          return res.redirect("/");
        }
        req.session.user = { email: users[0].email, usersid: users[0].id, avatar: users[0].avatar };
        req.flash("successInfo", "anda berhasil login");
        res.redirect("/todos");
      }
    } catch (e) {
      console.log(e);
      res.redirect("/");
    }
  });

  router.get("/register", function (req, res) {
    res.render("register", { failedInfo: req.flash("failedInfo"), successInfo: req.flash("successInfo") });
  });

  router.post("/register", async function (req, res) {
    const { email, password, repassword } = req.body;
    if (password !== repassword) {
      req.flash("failedInfo", "password doesn't match");
      res.redirect("/register");
    } else {
      const hash = bcrypt.hashSync(password, saltRounds);
      try {
        const { rows: users } = await db.query('SELECT * FROM "users" WHERE email = $1', [email]);
        if (users.length > 0) {
          req.flash("failedInfo", "user already exist");
          res.redirect("/register");
        } else {
          await db.query('INSERT INTO "users" (email, password) VALUES ($1, $2)', [email, hash]);
          req.flash("successInfo", "anda berhasil register, silahkan login");
          res.redirect("/");
        }
      } catch (err) {
        console.log(err);
        res.redirect("/register");
      }
    }
  });
  router.get("/logout", function (req, res) {
    req.session.destroy(function (err) {
      res.redirect("/");
    });
  });

  router.get("/upload/:id", isLoggedIn, function (req, res) {
    res.render("partials/upload", { preAvatar: req.session.user.avatar });
  });

  router.post("/upload/:id", isLoggedIn, async function (req, res) {
    let avatar;
    let uploadPath;
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send("No files were uploaded.");
    }

    avatar = req.files.avatar;
    let fileName = Date.now() + "_" + avatar.name;
    uploadPath = path.join(__dirname, "..", "public", "images", fileName);

    avatar.mv(uploadPath, async function (err) {
      if (err) return res.status(500).send(err);
      try {
        console.log(req.params)
        const { rows: profil } = await db.query('SELECT * FROM "users" WHERE id = $1', [req.params.id]);
        if (profil[0].avatar) {
          console.log('masuk')
          const filePath = path.join(__dirname, "..", "public", "images", profil[0].avatar);
          try {
            console.log('masuk hapus')
            fs.unlinkSync(filePath);
            
          } catch {
            console.log('masuk error')
            const { rows } = await db.query('UPDATE "users" SET avatar = $1 WHERE id = $2', [fileName, req.params.id]);
            res.redirect("/todos");
          }
        }
        console.log('test')
        const { rows } = await db.query('UPDATE "users" SET avatar = $1 WHERE id = $2', [fileName, req.params.id]);
        res.redirect("/todos");
      } catch {
        res.send(err);
      }
    });
  });

  return router;
};
