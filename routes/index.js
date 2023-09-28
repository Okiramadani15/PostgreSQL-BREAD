var express = require("express");
var router = express.Router();
const bcrypt = require("bcrypt");
const saltRounds = 10;
const path = require('path')

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
        req.session.users = { email: users[0].email, usersid: users[0].id, avatar: users[0].avatar };
        req.flash("successInfo", "anda berhasil login");
        res.redirect("./todos");
      }
    } catch (e) {
      console.log(e);
      res.redirect("/");
    }
  });

  router.get("/register", function (req, res) {
    res.render("register");
  });

  router.post("/register", async function (req, res) {
    const { email, password, repassword } = req.body;
    if (password !== repassword) {
      res.redirect("/register");
    } else {
      const hash = bcrypt.hashSync(password, saltRounds);
      try {
        const { rows: users } = await db.query('SELECT * FROM "users" WHERE email = $1', [email]);
        if (users.length > 0) {
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

  router.get("/upload/:id", function (req, res) {
    res.render("partials/upload");
  });

  router.post("/upload/:id", async function (req, res) {
    let sampleFile;
    let uploadPath;
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send("No files were uploaded.");
    }
    const avatar = req.files.avatar
    let avatarName = Date.now() + '-' + avatar.name;
    uploadPath = path.join(__dirname, '..', 'public', 'images', avatarName);
  
    avatar.mv(uploadPath, async function (err) {
      if (err) 
      return res.status(500).send(err);
     try{
        await db.query('UPDATE users SET avatar = $1 WHERE id = $2', [avatarName, req.params.id])
        res.redirect('/todos')
     } catch(err) {
      console.log(err)
     }
    });
  });

  return router;
};
