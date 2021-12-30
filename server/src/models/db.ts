import mongoose from 'mongoose';
import chalk from 'chalk';

mongoose.connect(process.env.MONGOURI || 'mongodb://localhost:27017');

mongoose.connection.on("connection", function () {
  console.log(chalk.blueBright('successful connection to database'));
});

mongoose.connection.on("error", function (err) {
  console.log(chalk.red("database connection error"), err);
});

mongoose.connection.on("disconnected", function () {
  console.log(chalk.yellow("database connection disconnected"));
});

// node close event
process.on("SIGINT", function () {
  manualclose();
});


export function manualclose() {
  mongoose.connection.close(function () {
    console.log(chalk.greenBright("database connection closed"));
  });
}