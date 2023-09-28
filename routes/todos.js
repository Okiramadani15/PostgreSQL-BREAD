var express = require("express");
var router = express.Router();
const path = require("path");
const fs = require("fs");
const moment = require ('moment')
var { isLoggedIn } = require("../helpers/util");

module.exports = function (db) {
  router.get("/", isLoggedIn, async function (req, res, next) {
    const { page = 1, title, startDate, endDate, complete, type_search = "id", sort = "", typeSort="" } = req.query;
    const {usersid} = req.session.users
    const queries = [];
    const params = [];
    ` `;
    const paramscount = [];
    const limit = 5;
    const offset = (page - 1) * 5;
    

    const { rows : profil } = await db.query('SELECT * FROM users WHERE id = $1', [req.session.users.usersid]);
    console.log(profil)
    // params.push(req.session.users.usersid)
    // paramscount.push(req.session.users.usersid)

    if (title) {
      params.push(title);
      paramscount.push(title);
      queries.push(`title like '%' || $${params.length} || '%'`);
    }

    if (startDate && endDate) {
      params.push(startDate, endDate);
      paramscount.push(startDate, endDate);
      queries.push(`deadline BETWEEN $${params.length - 1} and $${params.length}`);
    } else if (startDate) {
      params.push(startDate);
      paramscount.push(startDate);
      queries.push(`deadline >= $${params.length}`);
    } else if (endDate) {
      params.push(endDate);
      paramscount.push(endDate);
      queries.push(`deadline <= $${params.length}`);
    }

    if (complete) {
      params.push(JSON.parse(complete));
      paramscount.push(JSON.parse(complete));
      queries.push(`complete = $${params.length}`);
    }

    let sqlcount = "SELECT COUNT (*) AS total FROM public.todos";
    let sql = `SELECT * FROM todos`;
    if (queries.length > 0) {
      sql += ` AND (${queries.join(` ${type_search} `)})`;
      sqlcount += ` AND (${queries.join(` ${type_search} `)})`;
    }

    if (sort) {
      sql += ` ORDER BY ${sort} ${typeSort}`;
    }

    params.push(limit, offset);
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;
    console.log(sql)

    db.query(sqlcount, paramscount, (err, { rows: data }) => {
      if (err) res.send(err);
      else {
        const total = data[0].total;
        const pages = Math.ceil(total / limit);
        db.query(sql, params, (err, { rows: data }) => {
          if (err) res.render(err);
          else
            res.render("users/list", {
              data,
              query: req.query,
              pages,
              offset,
              page,
              url: req.url,
              moment,
              typeSort,
              usersid,
              avatar: profil[0].avatar,
              users: req.session.users,
              failedInfo: req.flash("failedInfo"),
              successInfo: req.flash("successInfo"),
            });
        });
      }
    });
  });

  router.get("/add/:userid", (req, res) => {
    res.render("users/add", { users: req.session.users});
  });

  router.post("/add/:userid", (req, res) => {
    db.query("INSERT INTO todos (title, userid) VALUES ($1, $2)", [req.body.title, req.params.userid], (err) => {
      if (err) res.send(err);
      else res.redirect("/todos");
    });
  });

  router.get("/edit/:index", isLoggedIn, async (req, res) => {
    const index = req.params.index;
    db.query("SELECT * FROM todos WHERE id = $1", [index], (err, { rows: data }) => {
      if (err) res.send(err);
       else res.render("users/edit", { item: data[0], moment });
    });
  });

  router.post("/edit/:index", (req, res) => {
    const index = req.params.index;
    console.log(req.body)
    const { title, deadline, complete } = req.body;
    console.log(req.body)
    db.query("UPDATE todos SET title = $1, complete = $2, deadline = $3 WHERE id = $4", [title, Boolean(complete), deadline, index], (err, data) => {
      if (err) res.send(err);
      else res.redirect("/todos");
    });
  });

  router.get("/delete/:index", (req, res) => {
    const index = req.params.index;
    db.query("DELETE FROM todos WHERE id = $1", [index], (err) => {
      if (err) res.send(err);
      else res.redirect("/todos");
    });
  });

  router.get("/upload/:id", function (req, res) {
    res.render("users/upload", { prevAvatar: req.session.users.avatar });
  });

  router.post("/upload/:id", async function (req, res) {
    let avatar;
    let uploadPath;
    console.log(req.files)
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send("No files were uploaded.");
    }

    avatar = req.files.avatar;
    let fileName = startDate.now() + "_" + avatar.name;
    uploadPath = path.join(__dirname, "..", "public", "images", fileName);

    avatar.mv(uploadPath, async function (err) {
      if (err) return res.status(500).send(err);
      try {
        const { rows: profil } = await db.query('SELECT * FROM "users" WHERE id = $1', [req.params.usersid]);
        if (profil[0].avatar) {
          const filePath = path.join(__dirname, "..", "public", "images", profil[0].avatar);
          try {
            fs.unlinkSync(filePath);
          } catch {
            const { rows } = await db.query('UPstartDate "users" SET avatar = $1 WHERE id = $2', [fileName, req.params.id]);
            res.redirect("/todos");
          }
        }
        const { rows } = await db.query('UPstartDate "users" SET avatar = $1 WHERE id = $2', [fileName, req.params.id]);
        res.redirect("/users");
      } catch {
        res.send(err);
      }
    });
  });
 
  return router;
};
