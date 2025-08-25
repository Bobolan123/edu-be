import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { UserService } from 'src/modules/user/user.service';
import { CreateUserDto } from 'src/modules/user/dto/create-user.dto';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private userService: UserService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.CALLBACKURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    if (!profile.emails || profile.emails.length === 0) {
      return done(new Error('No email found in Google profile'), null);
    }

    const email = profile.emails[0].value;
    const name = profile.displayName;
    const googleId = profile.id;
    const avatar_url = profile.photos?.[0]?.value || null;

    // Check if user exists
    let user = await this.userService.findByEmail(email);

    if (!user) {
      // Create new Google user
      const newUser: CreateUserDto = {
        email,
        name,
        googleId,
        avatar_url,
        password: null, // No password for Google users
        role: null, // Optional, unless you assign a default role
        isActive: true,
      };

      user = await this.userService.create(newUser);
    } else {
      // Ensure the user is active
      if (!user.isActive) {
        await this.userService.update(user.id, { isActive: true });
      }

      // Link Google ID if missing
      if (!user.googleId) {
        await this.userService.update(user.id, { googleId });
      }
    }

    done(null, user);
  }
}
