const routes = require("./routes");
const UserHandler = require("./handler");



module.exports = {
    name: 'users',
    version: '1.0.0',
    register: async (server, {service, validator}) => {
        const userHandler = new UserHandler(service, validator);
        server.route(routes(userHandler));
    },
};