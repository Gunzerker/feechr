exports.findOptionsWhere = (req, exactFields, searchFields) => {
  delete req.query.limit;
  delete req.query.page;
  formatQueryRequest(req);
  const fields = Object.keys(req.query);
  const where = {};
  let or = [];
  let and = [];
  if (fields) {
    //   fields.forEach((field_name) => {
    //     if (req.query[field_name]) {
    //       if (exactFields.includes(field_name)) {
    //         and = [...and, { [field_name]: req.query[field_name] }];
    //       }
    //     }
    //   });

    if (req.query.searchTxt) {
      searchFields.forEach((field_name) => {
        or = [
          ...or,
          {
            [field_name]: {
              $regex: req.query.searchTxt,
              $options: "i",
            },
          },
        ];
      });
    }
    if (or.length > 0) where["$or"] = or;
    console.log("WHERE CONDITIONS ", JSON.stringify(where));
    return where;
  }
};
const formatQueryRequest = (req) => {
  const queryKeys = Object.keys(req.query);
  console.log("queryKeys", queryKeys);
  queryKeys.forEach((field) => {
    let val = req.query[field];
    let isnum = /^\d+$/.test(val);
    if (isnum) {
      req.query[field] = String(val);
    } else console.log("false :",false);
  });
  console.log("FORMATED QUERY NUMBERS ", req.query);
};
