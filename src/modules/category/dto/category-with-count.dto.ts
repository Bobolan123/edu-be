export class CategoryWithCountDto {
  id: number;
  name: string;
  description: string;
  courseCount: number;

  constructor(category: any) {
    this.id = category.id;
    this.name = category.name;
    this.description = category.description;
    this.courseCount = parseInt(category.courseCount) || 0;
  }
}
