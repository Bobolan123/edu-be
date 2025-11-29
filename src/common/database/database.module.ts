import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USER'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [__dirname + '../../entities/*{.ts,.js}'],
        synchronize: true,
        autoLoadEntities: true,
        logging: false,
        ssl:
          configService.get('APP_ENV') === 'prod' ||
          configService.get('APP_ENV') === 'dev',
        extra:
          configService.get('APP_ENV') === 'prod' ||
          configService.get('APP_ENV') === 'dev'
            ? {
                ssl: {
                  rejectUnauthorized: false,
                },
              }
            : {},
      }),
    }),
    // MongoDB
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const username = config.get<string>('MONGO_USERNAME');
        const password = config.get<string>('MONGO_PASSWORD');
        const host = config.get<string>('MONGO_HOST');
        const port = config.get<string>('MONGO_PORT');
        const dbName = config.get<string>('MONGO_DB');
        const authDb = config.get<string>('MONGO_AUTH_DB');
        const appEnv = config.get<string>('APP_ENV');

        // Use MongoDB Atlas SRV connection for prod/dev, standard connection for local
        let uri: string;
        if (appEnv === 'prod' || appEnv === 'dev') {
          // MongoDB Atlas connection string (mongodb+srv://)
          uri = `mongodb+srv://${username}:${password}@${host}/${dbName}?retryWrites=true&w=majority`;
        } else {
          // Local MongoDB connection string (mongodb://)
          uri = `mongodb://${username}:${password}@${host}:${port}/${dbName}?authSource=${authDb}`;
        }

        return { uri };
      },
    }),
  ],
})
export class DatabaseModule {}
