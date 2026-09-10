import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto';
import { IResponse } from 'src/interfaces';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(200)
  @Post('sign-in')
  @ApiOperation({
    summary: 'Admin / Super-admin sign-in',
    description:
      'Authenticates an admin account and returns a JWT access token plus role. Use the token as `Authorization: Bearer <token>` on protected routes.',
  })
  @ApiBody({ type: SignInDto })
  @ApiResponse({
    status: 200,
    description: 'Signed in successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Signed in successfully',
        data: {
          accessToken: { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          role: 'Super-admin',
        },
        error: null,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 404, description: 'Admin email not found' })
  async signIn(@Body() signInDto: SignInDto): Promise<IResponse> {
    return await this.authService.signIn(signInDto);
  }
}
