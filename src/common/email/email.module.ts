import { Module } from '@nestjs/common';
import { MailerModule } from '@nest-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { HandlebarsAdapter } from '@nest-modules/mailer/dist/adapters/handlebars.adapter';

@Module({
  imports: [
    // Global ConfigModule for environment variables
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Mailer Module Configuration
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: configService.get('MAIL_HOST'),
          port: configService.get('MAIL_PORT') || 587,
          secure: configService.get('MAIL_SECURE') === 'true', 
          auth: {
            user: configService.get('MAIL_USER'),
            pass: configService.get('MAIL_PASSWORD'),
          },
        },
        defaults: {
          from: `"No Reply" <${configService.get('MAIL_FROM')}>`, 
        },
        template: {
          dir: join(__dirname, 'templates', 'email'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
  ],
})
export class EmailModule {}
