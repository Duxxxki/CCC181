require("dotenv").config();

const app = require("./app");

console.log("App type:", typeof app);
console.log("App.listen type:", typeof app.listen);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
