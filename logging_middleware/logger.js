module.exports = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const end = Date.now();

    console.log({
      method: req.method,
      url: req.originalUrl,
      body: req.body,
      status: res.statusCode,
      responseTime: `${end - start}ms`
    });
  });

  next();
};