var express = require("express");
var router = express.Router();
const path = require("path");
const fs = require("fs");
const moment = require("moment");
var { isLoggedIn } = require("../helpers/util");

module.exports = function (db) {
  router.get("/", isLoggedIn, async function (req, res, next) {
    const { page = 1, title, startDate, endDate, deadline, complete, type_search = "OR", sort = "desc", typeSort = "id" } = req.query;
    const { usersid } = req.session.user;
    const queries = [];
    const params = [];
    const paramscount = [];
    const limit = 5;
    const offset = (page - 1) * 5;
    const { rows: profil } = await db.query("SELECT * FROM users WHERE id = $1", [req.session.user.usersid]);

    let sqlcount = "SELECT COUNT (*) AS total FROM todos WHERE userid=$1";
    paramscount.push(req.session.user.usersid);
    params.push(req.session.user.usersid);

    if (title) {
      params.push(title);
      paramscount.push(title);
      queries.push(`title ilike '%' || $${params.length} || '%'`);
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
      params.push(complete);
      paramscount.push(complete);
      queries.push(`complete=$${params.length}`);
    }
    let sql = `SELECT * FROM todos WHERE userid=$1`;
    if (queries.length > 0) {
      sql += ` AND ${queries.join(` ${type_search} `)}`;
      sqlcount += ` AND ${queries.join(` ${type_search} `)}`;
    }

    if (sort) {
      sql += ` ORDER BY ${typeSort} ${sort}`;
    }

    params.push(limit, offset);
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;
    console.log(sqlcount, paramscount)
    db.query(sqlcount, paramscount, (err, { rows: data }) => {
      if (err) res.send(err);
      else {
        const url = req.url == "/" ? `/?page=${page}&typeSort=${typeSort}&sort=${sort}` : req.url;
        const total = data[0].total;
        const pages = Math.ceil(total / limit);
        db.query(sql, params, (err, { rows: data }) => {
          if (err) res.render(err);
          else {
            console.log(url)
            res.render("users/list", {
              data,
              query: req.query,
              pages,
              offset,
              page,
              moment,
              typeSort,
              sort,
              usersid,
              avatar: profil[0].avatar,
              users: req.session.user,
              failedInfo: req.flash("failedInfo"),
              successInfo: req.flash("successInfo"),
              url,
            });
          }
        });
      }
    });
  });

  router.get("/add/:userid", (req, res) => {
    res.render("users/add", { users: req.session.users });
  });

  router.post("/add/:userid", (req, res) => {
    db.query("INSERT INTO todos (title,complete,deadline,userid) VALUES ($1, $2,$3,$4)", [req.body.title, JSON.parse(req.body.Complete), req.body.Deadline, req.params.userid], (err) => {
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
    const { title, deadline, complete } = req.body;
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

  return router;
};
