require('dotenv').config();

const Hapi = require('@hapi/hapi');
const Jwt = require('@hapi/jwt');
const path = require('path');
const Inert = require('@hapi/inert');

// Notes
const notes = require('./api/notes');
const NotesService = require('./services/inMemory/postgres/NotesService');
const NotesValidator = require('./validator/notes');

// Exception
const ClientError = require('./exceptions/ClientError');

// Users
const users = require('./api/users');
const UsersService  = require('./services/inMemory/postgres/UserService');
const UsersValidator = require('./validator/users');

// authentications
const authentications = require('./api/authentications');
const AuthenticationsService = require('./services/inMemory/postgres/AuthenticationsService');
const TokenManager = require('./tokenize/TokenManager');
const AuthenticationsValidator = require('./validator/authentications');

// collaborations
const collaborations = require('./api/collaborations');
const CollaborationsService = require('./services/inMemory/postgres/CollaborationsService');
const CollaborationsValidator = require('./validator/collaborations');

// Exports
const _exports = require('./api/exports');
const ProducerService = require('./services/rabbitmq/ProducerService');
const ExportsValidator = require('./validator/exports');

// uploads
const uploads = require('./api/uploads');
const StorageService = require('./services/storage/StorageService');
const UploadsValidator = require('./validator/uploads');


// cache
const CacheService = require('./services/redis/CacheService');


// eslint-disable-next-line no-unused-vars
const init = async () => {
    const cacheService = new CacheService();
    const collaborationsService = new CollaborationsService(cacheService);
    const notesService = new NotesService(collaborationsService, cacheService);
    const usersService = new UsersService();
    const authenticationsService = new AuthenticationsService();
    const storageService = new StorageService(path.resolve(__dirname, 'api/uploads/file/images'));

    const server = Hapi.server({
        port: process.env.PORT,
        host: process.env.HOST,
        routes: {
            cors: {
                origin: ['*'],
            },
        },
    });

    await server.register([
        {
            plugin: Jwt,
        },
        {
            plugin: Inert,
        },
    ]);

    server.auth.strategy('notesapp_jwt', 'jwt', {
        keys: process.env.ACCESS_TOKEN_KEY,
        verify: {
            aud: false,
            iss: false,
            sub: false,
            maxAgeSec: process.env.ACCESS_TOKEN_AGE,
        },
        validate: (artifacts) => ({
            isValid: true,
            credentials: {
                id: artifacts.decoded.payload.id,
            },
        }),
    });

    await server.register([
        {
            plugin: notes,
            options: {
                service: notesService,
                validator: NotesValidator,
            },
        },
        {
            plugin: users,
            options: {
                service: usersService,
                validator: UsersValidator,
            },
        },
        {
            plugin: authentications,
            options: {
                authenticationsService,
                usersService,
                tokenManager: TokenManager,
                validator: AuthenticationsValidator,
            },
        },
        {
            plugin: collaborations,
            options: {
                collaborationsService,
                notesService,
                validator: CollaborationsValidator,
            },
        },
        {
            plugin: _exports,
            options: {
                service: ProducerService,
                validator: ExportsValidator,
            },
        },
        {
            plugin: uploads,
            options: {
                service: storageService,
                validator: UploadsValidator,
            },
        },
    ]);

    server.ext('onPreResponse', (request, h) => {
            // mendapatkan konteks response dari request
        const { response } = request;

            // penanganan client error secara internal.
        if (response instanceof ClientError) {
            const newResponse = h.response({
                status: 'fail',
                message: response.message,
                });
                newResponse.code(response.statusCode);
                return newResponse;
            }

            return h.continue;
            });

    await server.start();
        console.log(`Server berjalan pada ${server.info.uri}`);
        };
        
init();