import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto';
import { IResponse } from 'src/interfaces';
import { LoginDto, SignUpDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(200)
  @Post('sign-in')
  async signIn(@Body() signInDto: SignInDto): Promise<IResponse> {
    return await this.authService.signIn(signInDto);
  }

  @HttpCode(201)
  @Post('sign-up')
  async signUp(@Body() signupDto: SignUpDto): Promise<IResponse> {
    const response = await this.authService.createUser(signupDto);
    return response;
  }

  @HttpCode(200)
  @Post('log-in')
  async logIn(@Body() loginDto: LoginDto): Promise<IResponse> {
    return await this.authService.userLogIn(loginDto);
  }
}
