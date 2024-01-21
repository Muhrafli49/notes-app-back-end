/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.createTable('authentications', {
    toke: {
        type: 'TEXT',
        notNull: true,
    },
    });
};

exports.down = pgm => {
    pgm.dropTable('autentications');
};
