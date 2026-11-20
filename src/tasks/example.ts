export default {
  name: "Example task",
  schedule: "* * * * *",
  execute() {
    console.log("Running example task");
  },
};
