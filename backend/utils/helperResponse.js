function buildHelperResponse(request, resources, tasks) {
  const totalResults = resources.length + tasks.length;

  if (totalResults === 0) {
    return `I couldn't find anything matching "${request}". Try asking for a specific resource or task.`;
  }

  const parts = [];

  if (resources.length > 0) {
    parts.push(
      `I found ${resources.length} matching resource${
        resources.length === 1 ? "" : "s"
      }.`
    );

    resources.forEach((resource) => {
      parts.push(
        `${resource.title} is ${
          resource.availability || "listed"
        } and was posted by ${resource.postedBy}.`
      );
    });
  }

  if (tasks.length > 0) {
    parts.push(
      `I found ${tasks.length} matching task${
        tasks.length === 1 ? "" : "s"
      }.`
    );

    tasks.forEach((task) => {
      parts.push(
        `${task.title} is an open task with a reward of ${task.reward}.`
      );
    });
  }

  return parts.join(" ");
}

module.exports = {
  buildHelperResponse,
};
