exports.findOptionsWhere = (req, exactFields, searchFields) => {
  // delete req.query.limit;
  // delete req.query.page;
  //formatQueryRequest(req);
console.log(req)
  const fields = Object.keys(req);
  const where = {};
  let or = [];
  let and = [];
  if (fields) {
    fields.forEach((field_name) => {
      if (req[field_name]) {
        if (exactFields.includes(field_name)) {
          and = [...and, { [field_name]: req[field_name] }];
        }
      }
    });
    // if (req.query.post_parent_id === 1) {
    //   and = [...and, { ["post_parent_id"]: { $exists: true } }];
    // } else if (req.query.post_parent_id === "-1") {
    //   console.log("They should haven't a parent id ");
    //   and = [...and, { ["post_parent_id"]: { $exists: false } }];
    // }
    // if (req.query.period) {
    //   //const period = formatPeriod(req.query.period);
    //   const period = req.query.period.split(",");
    //   console.log("im the period ", period);
    //   and = [
    //     ...and,
    //     {
    //       updatedAt: {
    //         $gte: dayjs(period[0]).toDate(),
    //         $lte: dayjs(period[1]).toDate(),
    //       },
    //     },
    //   ];
    // }
    // if (req.query.active) {
    //   and = [
    //     ...and,
    //     {
    //       ["owner.active"]: {
    //         $regex: req.query.active,
    //         $options: "i",
    //       },
    //     },
    //   ];
    // }
    if (req.search) {
      searchFields.forEach((field_name) => {
        or = [
          ...or,
          {
            [field_name]: {
              $regex: req.search,
              $options: "i",
            },
          },
        ];
      });
    }
    if (or.length > 0) where["$or"] = or;
    if (and.length > 0) where["$and"] = and;
    console.log("WHERE CONDITIONS ", JSON.stringify(where));
    return where;
  }
};

/*const formatQueryRequest = (req) => {
  const queryKeys = Object.keys(req.query);
  console.log("queryKeys", queryKeys);
  queryKeys.forEach((field) => {
    let val = req.query[field];
    let isnum = /^\d+$/.test(val);
    if (isnum) {
      req.query[field] = Number(val);
    } else console.log(false);
  });*/
