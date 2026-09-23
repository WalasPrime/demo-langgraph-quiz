import { ArrayMaxSize, IsArray, IsInt, IsString, IsUrl, Min, MinLength } from 'class-validator';

export class StartQuizDto {
  @IsUrl({ protocols: ['https'], require_protocol: true })
  sourceUrl!: string;

  @IsString()
  @MinLength(1)
  topic!: string;
}

export class SubmitAnswerDto {
  @IsString()
  questionId!: string;

  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  selectedOptionIds!: string[];

  @IsInt()
  @Min(0)
  version!: number;
}