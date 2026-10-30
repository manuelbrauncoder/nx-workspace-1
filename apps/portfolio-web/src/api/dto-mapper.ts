/**
 * Base of every mapper that translates between the wire format of the API and the model the app
 * works with. Each API feature implements it once per DTO, e.g. `NoteDtoMapper`.
 */
export abstract class DtoMapper<Dto, Model> {
  abstract toModel(dto: Dto): Model;

  abstract toDto(model: Model): Dto;

  toModels(dtos: Dto[]): Model[] {
    return dtos.map((dto) => this.toModel(dto));
  }

  toDtos(models: Model[]): Dto[] {
    return models.map((model) => this.toDto(model));
  }
}
