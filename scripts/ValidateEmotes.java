import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import io.github.kosmx.emotes.common.serializer.gson.AnimationTypeAdapter;

class ValidateEmotes {
    public static void main(String[] args) throws Exception {
        for (String arg : args) {
            var bytes = Files.readAllBytes(Path.of(arg));
            var animation = AnimationTypeAdapter.fromBase64(Base64.getEncoder().encodeToString(bytes));
            if (animation == null) throw new IllegalStateException("Invalid emote: " + arg);
            System.out.println(Path.of(arg).getFileName() + ": " + animation.getNameOrId());
        }
    }
}
